from flask import Flask, jsonify, send_from_directory

app = Flask(__name__, static_folder='app/dist')

@app.route('/api/hello')
def hello():
    return jsonify(message="Hello from Flask!")

# Serve static files from the Preact build directory
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and path != "index.html": # Check if the path is not empty and not index.html
        # Attempt to serve the file from the static folder
        try:
            return send_from_directory(app.static_folder, path)
        except FileNotFoundError: # If the file is not found, serve index.html
            return send_from_directory(app.static_folder, 'index.html')
    else: # If the path is empty or index.html, serve index.html
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True) 