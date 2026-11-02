import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// GET all projects with summary stats
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST: Create or Update Project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, slug, webhookUrl } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Nama project tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing project
      const updated = await prisma.project.update({
        where: { id },
        data: {
          name,
          webhookUrl: webhookUrl || null,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    } else {
      // Create new project with auto-generated API Key and Webhook Secret
      const generatedSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const randomSuffix = crypto.randomBytes(16).toString("hex");
      const apiKey = `pay_live_${generatedSlug}_${randomSuffix.slice(0, 16)}`;
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

      const created = await prisma.project.create({
        data: {
          name,
          slug: `${generatedSlug}-${Date.now().toString().slice(-4)}`,
          apiKey,
          webhookUrl: webhookUrl || null,
          webhookSecret,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, data: created });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
