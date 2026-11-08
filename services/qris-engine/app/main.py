import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.core.config import settings
from app.db.database import init_db, AsyncSessionLocal
from app.services.mutation_matcher import expire_old_invoices
from app.api import qris, invoices, mutations, settings as settings_api

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("qris_engine")


async def invoice_cleaner_loop():
    """Background task untuk membersihkan invoice yang kedaluwarsa setiap 60 detik."""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await expire_old_invoices(session)
        except Exception as exc:
            logger.error(f"[CleanerLoop] Error: {exc}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("⚡ Inisialisasi Database QRIS Engine...")
    await init_db()
    cleaner_task = asyncio.create_task(invoice_cleaner_loop())
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} berjalan pada port {settings.PORT}")
    yield
    # Shutdown
    cleaner_task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(qris.router)
app.include_router(invoices.router)
app.include_router(mutations.router)
app.include_router(settings_api.router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# Mount static assets & Frontend UI
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    async def serve_dashboard():
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend static file not found"}

