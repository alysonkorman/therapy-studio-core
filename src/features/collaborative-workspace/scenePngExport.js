import { loadIconAsset } from "../../services/icons";

const size = { height: 900, width: 1200 };

function drawBackground(context, background) {
  const colors = {
    neutral: "#f4f2ee",
    outdoors: "#ddecfa",
    room: "#efe1d1",
    sand: "#e8d5af",
  };
  context.fillStyle = colors[background] ?? colors.outdoors;
  context.fillRect(0, 0, size.width, size.height);
}

export async function exportWorkspacePng(workspaceDocument, title = "scene") {
  const canvas = window.document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  drawBackground(context, workspaceDocument.background);

  for (const object of workspaceDocument.objects) {
    context.save();
    context.translate(object.x + object.width / 2, object.y + object.height / 2);
    context.rotate((object.rotation * Math.PI) / 180);
    context.scale(object.flipX ? -1 : 1, object.flipY ? -1 : 1);
    if (object.assetKind === "text") {
      context.fillStyle = object.color ?? "#312b42";
      context.font = `${Math.max(22, Math.min(54, object.height * 0.55))}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(object.text ?? "Text", 0, 0, object.width);
    } else if (object.assetKind === "shape") {
      context.fillStyle = object.color ?? "#8b6bd6";
      if (object.shape === "circle")
        context.arc(0, 0, Math.min(object.width, object.height) / 2, 0, Math.PI * 2);
      else
        context.roundRect(
          -object.width / 2,
          -object.height / 2,
          object.width,
          object.height,
          18
        );
      context.fill();
    } else if (object.assetKind === "icon") {
      try {
        const source = await loadIconAsset(object.assetId);
        const image = new Image();
        image.src = source;
        await image.decode();
        context.drawImage(
          image,
          -object.width / 2,
          -object.height / 2,
          object.width,
          object.height
        );
      } catch {
        // The canvas still exports the rest of the scene if one source cannot be decoded.
      }
    } else {
      context.font = `${Math.min(object.width, object.height)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(object.symbol ?? "", 0, 0);
    }
    context.restore();
  }
  const link = window.document.createElement("a");
  link.download = `${
    String(title)
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "scene"
  }.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
