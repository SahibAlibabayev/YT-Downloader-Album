from requests import request
import requests
import json

BASE_URL = 'http://127.0.0.1:5000'
TEST_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'

print("------ 1.STEP: VIDEO'S DATA FETCHING ------")    
# Frontendin "Məlumatları gətir" basmasın təqlid edirik
info_response = requests.get(f"{BASE_URL}/api/info", params={"url": TEST_URL})

if info_response.status_code == 200:
    print("Successfully! Fetched data:")
    print(json.dumps(info_response.json(), indent=2, ensure_ascii=False))
else:
    print("Error:",info_response.text)
 
print("\n------ 2.STEP: METADATA DOWNLOADING STARTING ------")
# Frontendin inputları doldurub "Endir" butonuna basmasını təqlid edirik
download_payload = {
    "url": TEST_URL,
    "format": "mp3",
    "mode": "single",
    "metadata": {
        "artist": "Eminem (Test)",
        "album":"Terminal Test Albümü",
        "genre": "Hip-Hop",
        "date": "2026",
        "track_number": "1"
    }
}

print("Downloading and converting process started, please wait...")
download_response = requests.post(f"{BASE_URL}/api/download", json=download_payload)

if download_response.status_code == 200:
    print("Downloading successfully! Result:")
    print(download_response.json())
else:
    print("Downloading Error:", download_response.text)













