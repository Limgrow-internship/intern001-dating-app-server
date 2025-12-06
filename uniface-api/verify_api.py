import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import insightface

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = insightface.app.FaceAnalysis(name="buffalo_l")
model.prepare(ctx_id=0, det_size=(640, 640))


@app.post("/face-embedding")
async def face_embedding(file: UploadFile = File(...)):
    try:
        img_bytes = await file.read()

        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return JSONResponse(
                status_code=400,
                content={"message": "Invalid image file"}
            )

        faces = model.get(img)

        if len(faces) == 0:
            return JSONResponse(
                status_code=400,
                content={"message": "No face detected"}
            )

        face = faces[0]  
        embedding = face.embedding  
        embedding_list = embedding.astype(float).tolist()

        bbox_list = [int(x) for x in face.bbox]
        score_val = float(face.det_score)

       
        return JSONResponse({
            "verified": True,
            "embedding": embedding_list,
            "bbox": bbox_list,
            "score": score_val,
            "face_count": len(faces)
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": 500,
                "message": "Internal Server Error",
                "error": str(e)
            }
        )
