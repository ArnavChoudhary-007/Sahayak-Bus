from flask import Flask, send_from_directory


app = Flask(__name__, static_folder="dist", static_url_path="")


@app.route("/")
def root():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    try:
        return send_from_directory(app.static_folder, path)
    except Exception:
        return send_from_directory(app.static_folder, "index.html")

