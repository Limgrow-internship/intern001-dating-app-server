import axios from "axios";
import FormData from "form-data";

export interface FaceEmbeddingResult {
  verified: boolean;
  embedding?: number[];
  confidence?: number;
  reason?: string;
}

export async function getFaceEmbedding(
  fileBuffer: Buffer,
  fileName: string = "file.jpg"
): Promise<FaceEmbeddingResult> {
  const form = new FormData();
  form.append('file', fileBuffer, fileName);

  const response = await axios.post(
    "http://localhost:8000/face-embedding",
    form,
    { headers: form.getHeaders() }
  );
  return response.data as FaceEmbeddingResult;
}