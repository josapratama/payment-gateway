import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class InvoiceStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class MutationType(str, enum.Enum):
    CR = "CR"  # Credit / Uang Masuk
    DB = "DB"  # Debit / Uang Keluar

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(50), primary_key=True, index=True)
    base_amount = Column(Integer, nullable=False)
    unique_code = Column(Integer, default=0, nullable=False)
    total_amount = Column(Integer, nullable=False, index=True)
    status = Column(SAEnum(InvoiceStatus), default=InvoiceStatus.PENDING, index=True, nullable=False)
    
    customer_name = Column(String(100), nullable=True)
    customer_contact = Column(String(100), nullable=True)
    memo = Column(String(255), nullable=True)
    
    dynamic_qris_payload = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    paid_at = Column(DateTime, nullable=True)
    
    matched_mutation_id = Column(Integer, nullable=True)
    callback_url = Column(String(500), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "base_amount": self.base_amount,
            "unique_code": self.unique_code,
            "total_amount": self.total_amount,
            "status": self.status.value,
            "customer_name": self.customer_name,
            "customer_contact": self.customer_contact,
            "memo": self.memo,
            "dynamic_qris_payload": self.dynamic_qris_payload,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "matched_mutation_id": self.matched_mutation_id,
        }

class Mutation(Base):
    __tablename__ = "mutations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank = Column(String(50), nullable=False, index=True)
    type = Column(SAEnum(MutationType), default=MutationType.CR, nullable=False)
    amount = Column(Float, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    sender_name = Column(String(100), nullable=True)
    
    is_matched = Column(Boolean, default=False, index=True)
    matched_invoice_id = Column(String(50), nullable=True)
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "bank": self.bank,
            "type": self.type.value,
            "amount": self.amount,
            "description": self.description,
            "sender_name": self.sender_name,
            "is_matched": self.is_matched,
            "matched_invoice_id": self.matched_invoice_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class MerchantSetting(Base):
    __tablename__ = "merchant_settings"

    key = Column(String(50), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

