export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the audio file"));
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return reject(new Error("Could not encode the audio file"));
      resolve(dataUrl.split(",", 2)[1]);
    };
    reader.readAsDataURL(file);
  });
}
