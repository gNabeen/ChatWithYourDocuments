let currentUserID;
disableQueryForm();

function updatePDFViewer(fileUrl) {
    const iframe = document.getElementsByTagName("iframe")[0];
    iframe.src = fileUrl;
}

$('input[name=document_type]').on('change', function () {
    let selectedValue = $('input[name=document_type]:checked').val();
    if (selectedValue === 'upload') {
        $('#upload-form').show();
        $('#url-form').hide();
    } else {
        $('#upload-form').hide();
        $('#url-form').show();
    }
});

function showLoadingIndicator() {
    let messageDiv = document.createElement('div');
    messageDiv.className = 'response-message-container';

    let messageWrapper = document.createElement('div');
    messageWrapper.className = 'response-message';

    let loadingIndicator = document.createElement('span');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<span class="dot">•</span><span class="dot">•</span><span class="dot">•</span>';

    messageWrapper.appendChild(loadingIndicator);
    messageDiv.appendChild(messageWrapper);

    let chatContent = document.getElementById('chat-content');
    chatContent.appendChild(messageDiv);
    chatContent.scrollTop = chatContent.scrollHeight;
}

function hideLoadingIndicator() {
    let loadingIndicators = document.getElementsByClassName('loading-indicator');
    if (loadingIndicators.length > 0) {
        let lastLoadingIndicator = loadingIndicators[loadingIndicators.length - 1];
        lastLoadingIndicator.parentElement.remove();
    }
}

$(document).ready(function () {
    appendMessage('response', 'Please load a document to initiate the chat.');
    $('#upload-form, #url-form').on('submit', function (e) {
        e.preventDefault();

        let formData = new FormData(this);
        if ($('#url-form').is(':visible')) {
            formData.append('url', $('#url-input').val());
        }

        if ($('#upload-form').is(':visible') || $('#url-form').is(':visible')) {
            disableQueryForm();
        }

        $.ajax({
            type: 'POST',
            url: '/submit_document',
            data: formData,
            contentType: false,
            processData: false,
            beforeSend: function () {
                let loadingMessage;
                if ($('#file').val()) {
                    let fileName = $('#file').val().split('\\').pop();
                    appendMessage('query', fileName);
                    loadingMessage = 'Loading document: <strong>' + fileName + '</strong>';
                } else if ($('#url-input').val()) {
                    let url = $('#url-input').val();
                    appendMessage('query', url);
                    loadingMessage = 'Loading document from URL: <strong>' + url + '</strong>';
                }
                appendMessage('response', loadingMessage);
                showLoadingIndicator();
            },
            success: function (data) {
                hideLoadingIndicator();
                if (data && data.hasOwnProperty('success') && data.success) {
                    currentUserID = data.user_id;
                    enableQueryForm();
                    updatePDFViewer(data.pdf_url);
                    appendMessage('response', 'Document successfully loaded. Please ask any questions about it.');
                } else {
                    appendMessage('response', 'An error occurred while loading the document.');
                }
            },
            error: function () {
                hideLoadingIndicator();
                appendMessage('response', 'An error occurred while loading the document.');
            }
        });
    });
});

$('#query-form').on('submit', function (e) {
    e.preventDefault();
    let query = $('#query').val();
    appendMessage('query', query);
    showLoadingIndicator();

    $.post('/submit_query', $(this).serialize() + `&user_id=${currentUserID}`, function (data) {
        hideLoadingIndicator();
        appendMessage('response', data.response);
    });

    $('#query').val('');
});

function disableQueryForm() {
    $('button[type=submit]').attr('disabled', 'disabled').removeClass('ready-to-chat').addClass('not-ready-to-chat');
}

function enableQueryForm() {
    $('button[type=submit]').removeAttr('disabled').removeClass('not-ready-to-chat').addClass('ready-to-chat');
    $('#query').removeAttr('disabled');
}

function appendMessage(sender, message) {
    let messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message-container`;

    let messageWrapper = document.createElement('div');
    messageWrapper.className = `${sender}-message`;

    let messageSpan = document.createElement('span');
    messageSpan.innerHTML += message;

    messageWrapper.appendChild(messageSpan);
    messageDiv.appendChild(messageWrapper);

    let chatContent = document.getElementById('chat-content');
    chatContent.appendChild(messageDiv);
    chatContent.scrollTop = chatContent.scrollHeight;
}

$('.drag-and-drop-area').on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('drag-over');
});

$('.drag-and-drop-area').on('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('drag-over');
});

$('.drag-and-drop-area').on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('drag-over');

    let droppedFile = e.originalEvent.dataTransfer.files[0];
    if (droppedFile) {
        $('#file')[0].files = e.originalEvent.dataTransfer.files;
        let fileName = droppedFile.name;
        $('.file-placeholder').hide();
        $('.selected-file-name').text(fileName).show();
        enableLoadDocumentButton();
    } else {
        $('.file-placeholder').show();
        $('.selected-file-name').hide();
        disableLoadDocumentButton();
    }
});

$('#file').on('change', function () {
    let fileName = $(this).val().split('\\').pop();
    if (fileName) {
        $('.file-placeholder').hide();
        $('.selected-file-name').text(fileName).show();
        enableLoadDocumentButton();
    } else {
        $('.file-placeholder').show();
        $('.selected-file-name').hide();
        disableLoadDocumentButton();
    }
});
$('#url-input').on('keyup', function () {
    ($(this).val()) ? enableLoadDocumentButton() : disableLoadDocumentButton();
});

function enableLoadDocumentButton() {
    ($('#upload-form').is(':visible')) ? $('#load-document-button').removeAttr('disabled') : $('#load-document-url-button').removeAttr('disabled');
}

function disableLoadDocumentButton() {
    ($('#upload-form').is(':visible')) ? $('#load-document-button').attr('disabled', 'disabled') : $('#load-document-url-button').attr('disabled', 'disabled');
}