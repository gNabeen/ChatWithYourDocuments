from flask import Flask, render_template, request, jsonify, send_from_directory
from langchain.document_loaders import UnstructuredPDFLoader, OnlinePDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma, Pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
import pinecone
from langchain.llms import OpenAI
from langchain.chains.question_answering import load_qa_chain
import os
import uuid
from werkzeug.utils import secure_filename
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Variable to store the processed document
docsearch = None
chain = None

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_API_ENV = os.getenv('PINECONE_API_ENV')
INDEX_NAME = os.getenv('INDEX_NAME')

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/pdfs/<path:filename>')
def serve_pdf(filename):
    return send_from_directory(directory="docs", path=filename)


@app.route('/submit_document', methods=['POST'])
def submit_document():
    global docsearch, chain

    # Reset the docsearch and chain to None
    docsearch = None
    chain = None
    # Generate a unique user_id (UUID4)
    user_id = str(uuid.uuid4())

    document_url = request.form.get('url')
    document_file = request.files.get('file')

    pdf_folder_path = os.path.join(BASE_DIR, 'docs')

    if document_file:
        secure_file_name = secure_filename(document_file.filename)
        document_file.save(os.path.join(pdf_folder_path, secure_file_name))
        docsearch, chain = process_document(
            os.path.join(pdf_folder_path, secure_file_name), user_id, is_filepath=True)

        pdf_url = f"/pdfs/{secure_file_name}"
    else:
        response = requests.get(document_url)
        parsed_url = urlparse(document_url)
        file_name_with_path = os.path.join(
            pdf_folder_path, os.path.basename(parsed_url.path))
        with open(file_name_with_path, 'wb') as f:
            f.write(response.content)

        docsearch, chain = process_document(
            file_name_with_path, user_id, is_filepath=True)
        pdf_url = f"/pdfs/{os.path.basename(parsed_url.path)}"

    return jsonify(success=True, user_id=user_id, pdf_url=pdf_url)

@app.route('/submit_query', methods=['POST'])
def submit_query():
    query = request.form['query']
    user_id = request.form['user_id']
    response = ask_question(query, user_id)
    return jsonify({'response': response})


def process_document(document_url, user_id, is_filepath=False):
    if is_filepath:
        loader = UnstructuredPDFLoader(document_url)
    else:
        loader = OnlinePDFLoader(document_url)

    data = loader.load()

    # Print the loaded data for debugging purposes
    # print("Loaded data:\n", data)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=0)
    texts = text_splitter.split_documents(data)

    # Print the splitted texts for debugging purposes
    # print("Splitted texts:\n", texts)

    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

    pinecone.init(
        api_key=PINECONE_API_KEY,
        environment=PINECONE_API_ENV
    )

    metadata = [{"user_id": user_id}]
    print("Metadata:\n", metadata)

    docsearch = Pinecone.from_texts(
        [t.page_content for t in texts],
        embeddings,
        metadata=metadata,  # Add the user_id to the metadata
        index_name=INDEX_NAME,
    )

    llm = OpenAI(temperature=0, top_p=1,
                 openai_api_key=OPENAI_API_KEY)
    chain = load_qa_chain(llm, chain_type="stuff")

    return docsearch, chain


def ask_question(query, user_id):
    global docsearch, chain

    if docsearch is None:
        return "Please load a document first."
    
    print(query)

    docs = docsearch.similarity_search(query, include_metadata=True)

    print("Retrieved documents:\n", docs)

    print(user_id)
    result = chain.run(input_documents=docs, question=query)
    return result


if __name__ == '__main__':
    app.run(debug=True, port=4000)
