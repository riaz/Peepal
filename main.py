from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import os
import logging
from models import db, User, Document, Annotation
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_pdf():
    logging.info("Upload request received")
    if 'file' not in request.files:
        logging.error("No file part in the request")
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        logging.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        upload_folder = app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
            logging.info(f"Created upload folder: {upload_folder}")
        file_path = os.path.join(upload_folder, filename)
        try:
            file.save(file_path)
            logging.info(f"File saved successfully: {file_path}")
            
            # Save document info to database
            new_document = Document(filename=filename, file_path=file_path)
            db.session.add(new_document)
            db.session.commit()
            logging.info(f"Document added to database: {new_document.id}")
            
            return jsonify({'success': True, 'document_id': new_document.id}), 200
        except Exception as e:
            logging.error(f"Error saving file: {str(e)}")
            return jsonify({'error': 'Error saving file'}), 500
    logging.error("Invalid file type")
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/documents', methods=['GET'])
def get_documents():
    documents = Document.query.all()
    return jsonify([{'id': doc.id, 'filename': doc.filename} for doc in documents])

@app.route('/annotations', methods=['POST'])
def save_annotation():
    try:
        data = request.json
        new_annotation = Annotation(
            document_id=data['document_id'],
            content=data['content'],
            annotation_type=data['type'],
            page=data['page'],
            position_x=data['position_x'],
            position_y=data['position_y'],
            highlight_rects=data.get('highlight_rects')
        )
        db.session.add(new_annotation)
        db.session.commit()
        logging.info(f"Annotation saved successfully: {new_annotation.id}")
        return jsonify({'success': True, 'annotation_id': new_annotation.id}), 200
    except Exception as e:
        logging.error(f"Error saving annotation: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/annotations/<int:document_id>', methods=['GET'])
def get_annotations(document_id):
    try:
        annotations = Annotation.query.filter_by(document_id=document_id).all()
        return jsonify([{
            'id': ann.id,
            'content': ann.content,
            'type': ann.annotation_type,
            'page': ann.page,
            'position_x': ann.position_x,
            'position_y': ann.position_y,
            'highlight_rects': ann.highlight_rects
        } for ann in annotations])
    except Exception as e:
        logging.error(f"Error retrieving annotations: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/uploads/<filename>')
def serve_file(filename):
    logging.info(f"Serving file: {filename}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    with app.app_context():
        db.drop_all()  # This will drop all existing tables
        db.create_all()  # This will create all tables based on your models
    app.run(host='0.0.0.0', port=5000, debug=True)
