#after config db run migration cmd
npx migrate-mongo create  <name migration>


# run docker
docker-compose up --build

#down
docker-compose down

#python
python3 -m venv venv
venv\Scripts\activate

pip install fastapi
pip install "uvicorn[standard]"
pip install insightface
pip install onnxruntime
pip install opencv-python-headless
pip install numpy

run:     uvicorn main:app --host 0.0.0.0 --port 8000
