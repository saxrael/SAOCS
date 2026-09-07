from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Appliance(Base):
    __tablename__ = "appliances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    relay_channel: Mapped[int] = mapped_column(Integer, nullable=False)
    assumed_wattage_watts: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

    __table_args__ = (
        UniqueConstraint("device_id", "relay_channel", name="uq_device_relay_channel"),
    )

    state = relationship(
        "ApplianceState",
        back_populates="appliance",
        uselist=False,
        cascade="all, delete-orphan",
    )
    activity_logs = relationship(
        "ActivityLog",
        back_populates="appliance",
        cascade="all, delete-orphan",
    )
    schedules = relationship(
        "Schedule",
        back_populates="appliance",
        cascade="all, delete-orphan",
    )

class ApplianceState(Base):
    __tablename__ = "appliance_state"

    appliance_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("appliances.id", ondelete="CASCADE"),
        primary_key=True,
    )
    current_state: Mapped[str] = mapped_column(String(10), default="OFF", nullable=False)
    last_changed_source: Mapped[str] = mapped_column(String(20), default="boot", nullable=False)
    last_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    appliance = relationship("Appliance", back_populates="state")
