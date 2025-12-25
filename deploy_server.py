from flask import Flask, request, jsonify
import subprocess
import hmac
import hashlib

app = Flask(__name__)
# Secure this with a secret set in your GitHub Webhook settings
GITHUB_SECRET = b'your_webhook_secret_here'

def verify_signature(payload, signature):
    sha_name, signature = signature.split('=')
    mac = hmac.new(GITHUB_SECRET, msg=payload, digestmod=hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), signature)

@app.route('/update-app', methods=['POST'])
def update_app():
    signature = request.headers.get('X-Hub-Signature-256')
    if not signature or not verify_signature(request.data, signature):
        return "Invalid signature", 403

    # Run the deployment commands
    # We pass the latest commit hash to the build process
    cmd = """
    git pull origin main && \
    export GIT_COMMIT_HASH=$(git rev-parse HEAD) && \
    docker compose up -d --build
    """
    subprocess.Popen(cmd, shell=True)
    return jsonify({"message": "Deployment triggered"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)