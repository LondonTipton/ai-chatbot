import { experimental_generateImage as generateImage } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream }) => {
    const { image } = await generateImage({
      model: myProvider.imageModel("small-model"),
      prompt: title,
    });

    const base64Image = image.base64;

    dataStream.write({
      type: "data-imageDelta",
      data: base64Image,
      transient: true,
    });

    return base64Image;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    // For image updates, we generate a new image based on the description
    const { image } = await generateImage({
      model: myProvider.imageModel("small-model"),
      prompt: description,
    });

    const base64Image = image.base64;

    dataStream.write({
      type: "data-imageDelta",
      data: base64Image,
      transient: true,
    });

    return base64Image;
  },
});
