import { AdminActionButton } from "../ui/AdminActionControl";
import {
  Check,
  EyeOff,
  GripVertical,
  Star,
} from "lucide-react";
import type { ManagedWeddingImage } from "../../types/imageManager";

export function ImageCard({
  image,
  active,
  selected,
  dragging,
  onOpen,
  onToggleSelected,
  onRate,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  image: ManagedWeddingImage;
  active: boolean;
  selected: boolean;
  dragging: boolean;
  onOpen: (event: React.MouseEvent) => void;
  onToggleSelected: () => void;
  onRate: (rating: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  return (
    <article
      onDragEnter={(event) => {
        event.preventDefault();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "22px",
        border: active
          ? "2px solid #111"
          : selected
            ? "2px solid #737373"
            : "1px solid rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.82)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.035)",
        opacity: dragging ? 0.4 : 1,
        boxSizing: "border-box",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(event as unknown as React.MouseEvent);
          }
        }}
        style={{
          position: "relative",
          aspectRatio: "4 / 5",
          overflow: "hidden",
          background: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        <img
          src={image.thumbSrc}
          alt={image.aiAlt || image.filename}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            opacity: image.hidden ? 0.4 : 1,
            filter: image.hidden ? "grayscale(1)" : "none",
          }}
        />

        <AdminActionButton
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelected();
          }}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 60,
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: selected
              ? "1px solid #111"
              : "1px solid rgba(255,255,255,0.85)",
            background: selected ? "#111" : "rgba(255,255,255,0.92)",
            color: selected ? "#fff" : "transparent",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            cursor: "pointer",
          }}
          aria-label={selected ? "Deselect image" : "Select image"}
        >
          <Check size={18} />
        </AdminActionButton>

        <div
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", image.id);

            const ghost = document.createElement("div");
            ghost.textContent = selected ? "Move selected images" : "Move image";
            ghost.style.position = "absolute";
            ghost.style.top = "-1000px";
            ghost.style.padding = "8px 12px";
            ghost.style.background = "#111";
            ghost.style.color = "#fff";
            ghost.style.borderRadius = "999px";
            document.body.appendChild(ghost);
            event.dataTransfer.setDragImage(ghost, 20, 20);
            window.setTimeout(() => ghost.remove(), 0);

            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          style={{
            position: "absolute",
            right: "12px",
            bottom: "12px",
            zIndex: 50,
            width: "42px",
            height: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            background: "#ffffff",
            color: "#111111",
            border: "1px solid rgba(0,0,0,0.15)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
            cursor: "grab",
            pointerEvents: "auto",
          }}
          title={selected ? "Drag selected images" : "Drag image"}
          aria-label={selected ? "Drag selected images" : "Drag image"}
        >
          <GripVertical size={22} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "12px",
            top: "12px",
            zIndex: 20,
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {image.isCover ? (
            <span
              style={{
                borderRadius: "999px",
                background: "#111",
                color: "#fff",
                padding: "4px 10px",
                fontSize: "12px",
              }}
            >
              Cover
            </span>
          ) : null}

          {image.hidden ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "999px",
                background: "#fef3c7",
                color: "#78350f",
                padding: "4px 10px",
                fontSize: "12px",
              }}
            >
              <EyeOff size={12} />
              Hidden
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <p
          style={{
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "12px",
            color: "#737373",
          }}
        >
          {image.filename}
        </p>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            position: "relative",
            zIndex: 60,
          }}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <AdminActionButton
              key={rating}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRate(rating);
              }}
              style={{
                appearance: "none",
                border: 0,
                background: "transparent",
                padding: "5px",
                margin: 0,
                cursor: "pointer",
                lineHeight: 0,
                borderRadius: "6px",
                pointerEvents: "auto",
              }}
              aria-label={`Rate ${rating} stars`}
            >
              <Star
                size={21}
                fill={rating <= image.rating ? "#111111" : "none"}
                color={rating <= image.rating ? "#111111" : "#a3a3a3"}
              />
            </AdminActionButton>
          ))}
        </div>

        <button
          type="button"
          onClick={(event) => onOpen(event)}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: 0,
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <p
            style={{
              margin: "10px 0 0",
              minHeight: "40px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              fontSize: "14px",
              lineHeight: 1.4,
              color: "#262626",
            }}
          >
            {image.aiCaption || "No caption"}
          </p>
        </button>
      </div>
    </article>
  );
}
