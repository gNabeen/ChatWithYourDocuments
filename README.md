# Chat with Your Documents

This application uses [LangChain](https://python.langchain.com/), [Pinecone](https://pinecone.io/), and [ChatGPT](https://openai.com/) to allow you to upload your PDF documents and ask questions about them.

## Screenshot
![ChatWithDocuments Demo](/images/demo.png)

## Installation
`pip install -r requirements.txt`

## Configuration
Copy `.env.example` to `.env` and fill in the values.

## Pinecone Setup
1. Create a [Pinecone](https://pinecone.io/) account and get your API key.
2. Create a Pinecone index
![Create Pinecone Index](/images/create_pinecone_index.png)
## Usage
`python app.py`

## Contributing
Feel free to contribute to this project.

## License
MIT License