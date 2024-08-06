let isSaveClicked = false;
let surveyResponses = {
    survey: "",
    employee: "",
    submission_date: "",
    answers: {}
};
let employee = "";

frappe.ready(function() {
    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Employee",
            filters: { "user_id": frappe.session.user },
            fieldname: "name"
        },
        callback: function(response) {
            if (response.message) {
                const employee = response.message.name;
                const urlParams = new URLSearchParams(window.location.search);
                const surveyId = urlParams.get('survey');

                frappe.call({
                    method: "frappe.client.get_value",
                    args: {
                        doctype: "Survey Response",
                        filters: { "employee": employee, 'survey': surveyId },
                        fieldname: "name"
                    },
                    callback: function(response) {
                        if (response.message) {
                            const surveyResponseId = response.message.name;

                            if (surveyResponseId) {
                                fetchSurveyResponse(surveyResponseId, function(response) {
                                    if (response) {
                                        displaySurveyResponse(response);
                                    }
                                });
                            } else {
                                initializeSurveyForm(surveyId);
                            }
                        } else {
                            initializeSurveyForm(surveyId);
                        }
                    }
                });
            } else {
                frappe.msgprint("Employee record not found for the logged-in user.");
            }
        }
    });
});

/**
 * Fetch the survey response data from the server.
 * @param {string} surveyResponseId - The ID of the survey response to fetch.
 * @param {function} callback - The callback function to execute with the survey response data.
 */
function fetchSurveyResponse(surveyResponseId, callback) {
    frappe.call({
        method: "hrms.survey.web_form.submit_survey_response.submit_survey_response.get_survey_response",
        args: { survey_response_id: surveyResponseId },
        callback: function(r) {
            if (r.message) {
                callback(r.message);
            } else {
                frappe.msgprint("Failed to fetch survey response.");
            }
        }
    });
}

/**
 * Display the survey response in a read-only format.
 * @param {Object} response - The survey response data.
 */
function displaySurveyResponse(response) {
    $('h1.ellipsis').text(response.survey);
    $('.ql-editor.read-mode').text(response.desc);

    let responseHtml = `
        <div class="form-group">
            <label class="form-label">Submission Date</label>
            <input type="text" class="form-control" value="${response.submission_date}" disabled>
        </div>
    `;

    response.answers.forEach(function(answer) {
        responseHtml += `
            <div class="form-group">
                <label class="form-label">${answer.question_text}</label>
                <input type="text" class="form-control" value="${answer.answer}" disabled>
            </div>
        `;
    });

    // Hide action buttons and indicators
    $('.form-group').html(responseHtml);
    $('.right-area').hide();
    $('.indicator-pill.orange').hide();
}

/**
 * Initializes the survey form by setting the submission date,
 * fetching the survey questions, and setting up form submission handling.
 */
function initializeSurveyForm(surveyId) {
    setTodayDate();

    if (surveyId) {
        fetchSurveyQuestions(surveyId, function(survey) {
            const today = new Date();
            const startDate = new Date(survey.start_date);
            const endDate = new Date(survey.end_date);

            // Check if today's date is NOT within the start and end dates
            if (today < startDate || today > endDate) {
                showSuccessPage();
                return;
            }
            $('h1.ellipsis').text(survey.title);
            if (survey.description) {
                $('.ql-editor.read-mode').text(survey.description);
            }
            renderSurveyQuestions(survey.questions);
            setupButtonActions(survey);
        });
    }
}

/**
 * Sets today's date as the value of the 'submission_date' field.
 */
function setTodayDate() {
    let today = new Date();
    let formattedDate = today.toISOString().split('T')[0];  // Format the date as YYYY-MM-DD
    frappe.web_form.set_value('submission_date', formattedDate);
}

/**
 * Fetches the survey questions for the given survey ID and executes the callback with the survey data.
 * @param {string} surveyId - The ID of the survey to fetch questions for.
 * @param {function} callback - The callback function to execute with the survey data.
 */
function fetchSurveyQuestions(surveyId, callback) {
    frappe.call({
        method: "hrms.survey.web_form.submit_survey_response.submit_survey_response.get_survey_questions",
        args: { survey_id: surveyId },
        callback: function(r) {
            if (r.message && r.message.survey) {
                callback(r.message.survey);
            } else {
                frappe.msgprint("Failed to fetch survey questions.");
            }
        }
    });
}

/**
 * Renders the survey questions on the form.
 * @param {Array} questions - The list of survey questions to render.
 */
function renderSurveyQuestions(questions) {
    let questionElements = [];

    questions.forEach(function(question) {
        let fieldHtml = '';
        if (question.question_type === "Multiple Choice") {
            fieldHtml = renderMultipleChoiceQuestion(question);
        } else if (question.question_type === "Rating") {
            fieldHtml = renderRatingQuestion(question);
        } else if (question.question_type === "Text") {
            fieldHtml = renderTextQuestion(question);
        }
        questionElements.push(fieldHtml);
    });

    $('.form-group').append(...questionElements);
    setupStarRatingEventListeners();
}

/**
 * Renders a multiple choice question.
 * @param {Object} question - The question object.
 * @returns {string} - The HTML string for the multiple choice question.
 */
function renderMultipleChoiceQuestion(question) {
    let options = question.options ? question.options.split(',') : [];
    return `<div class="form-group">
                <label>${question.question_text} <span style="color: red">*</span></label>
                <div class="form-check">
                    ${options.map(option => `<input class="form-check-input" type="radio" name="question_${question.name}" value="${option}" required><label class="form-check-label">${option}</label><br>`).join('')}
                </div>
            </div>`;
}

/**
 * Renders a rating question.
 * @param {Object} question - The question object.
 * @returns {string} - The HTML string for the rating question.
 */
function renderRatingQuestion(question) {
    return `<div class="form-group">
                <label>${question.question_text} <span style="color: red">*</span></label>
                <div class="star-rating" data-name="question_${question.name}">
                    ${[...Array(5)].map((_, i) => `<span class="star" data-value="${i + 1}">&#9733;</span>`).join('')}
                    <input type="hidden" name="question_${question.name}" value="0" required>
                </div>
            </div>`;
}

/**
 * Renders a text question.
 * @param {Object} question - The question object.
 * @returns {string} - The HTML string for the text question.
 */
function renderTextQuestion(question) {
    return `<div class="form-group">
                <label>${question.question_text} <span style="color: red">*</span></label>
                <input type="text" class="form-control" name="question_${question.name}" required>
            </div>`;
}

/**
 * Sets up event listeners for the star rating questions.
 */
function setupStarRatingEventListeners() {
    $('.star-rating .star').on('click', function() {
        const value = $(this).data('value');
        $(this).siblings('input').val(value);
        $(this).parent().children('.star').each(function() {
            if ($(this).data('value') <= value) {
                $(this).addClass('selected');
            } else {
                $(this).removeClass('selected');
            }
        });
    });
}

/**
 * Validates the form by checking if all required fields are filled.
 * @returns {boolean} - Returns true if the form is valid, otherwise false.
 */
function validateForm() {
    let isValid = true;
    let invalids = [];

    // Clear previous answers
    surveyResponses.answers = {};

    // Get survey and submission date
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get('survey');
    surveyResponses.survey = surveyId;
    surveyResponses.submission_date = frappe.web_form.get_value('submission_date');

    // Check required text inputs and radio buttons
    $('.form-group input[required]').each(function() {
        if ($(this).is(':visible')) {
            if (!$(this).val()) {
                isValid = false;
                $(this).addClass('is-invalid');
                invalids.push(this.name);
            } else {
                let index = invalids.indexOf(this.name);
                if (index !== -1) {
                    invalids.splice(index, 1);
                }
                $(this).removeClass('is-invalid');
                surveyResponses.answers[this.name] = $(this).val();
            }
        }
    });

    // Check required radio buttons
    $('.form-group input[type="radio"][required]').each(function() {
        if ($(this).is(':visible')) {
            let name = $(this).attr('name');
            if (!$(`input[name="${name}"]:checked`).length) {
                isValid = false;
                invalids.push(name);
                $(`input[name="${name}"]`).addClass('is-invalid');
            } else {
                $(`input[name="${name}"]`).removeClass('is-invalid');
                surveyResponses.answers[name] = $(`input[name="${name}"]:checked`).val();
            }
        }
    });

    // Check required rating fields
    $('.star-rating').each(function() {
        if ($(this).is(':visible')) {
            let input = $(this).find('input[required]');
            if (input.val() === "0") {
                isValid = false;
                $(this).addClass('is-invalid');
                invalids.push($(this).attr('data-name'));
            } else {
                $(this).removeClass('is-invalid');
                surveyResponses.answers[$(this).attr('data-name')] = input.val();
            }
        }
    });

    return isValid;
}

/**
 * Sets up the form submission handling.
 * @param {Object} survey - The survey object containing the questions.
 */
function handleFormSubmission(survey) {
    if (isSaveClicked) {
        // Perform custom validation
        if (!validateForm()) {
            frappe.msgprint("Please fill out all required fields.");
            isSaveClicked = false;
            return false;
        }

        // Get the logged-in user's employee record
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Employee",
                filters: { "user_id": frappe.session.user },
                fieldname: "name"
            },
            callback: function(response) {
                if (response.message) {
                    surveyResponses.employee = response.message.name;
                    submitSurveyResponse(surveyResponses);
                } else { 
                    frappe.msgprint("Employee record not found for the logged-in user.");
                }
            }
        });
    }
}

/**
 * Submits the survey response to the server.
 * @param {Object} surveyResponse - The survey response data to submit.
 */
function submitSurveyResponse(surveyResponse) {
    frappe.call({
        method: "hrms.survey.web_form.submit_survey_response.submit_survey_response.submit_survey_response",
        args: {
            survey_response: JSON.stringify(surveyResponse)
        },
        callback: function(r) {
            if (r.message) {
                $('.web-form-container').hide();
                $('.success-page').removeClass('hide');
                $('.success-footer').hide();
            }
            isSaveClicked = false;
        }
    });
}

/**
 * Sets up actions for the "Discard" and "Save" buttons in the .right-area class.
 * @param {Object} survey - The survey object containing the questions.
 */
function setupButtonActions(survey) {
    // Remove existing buttons in the .right-area div
    $('.right-area').empty();

    // Create and append new buttons
    const discardButton = $(`
        <!-- discard button -->
        <button class="discard-btn btn btn-default btn-sm">
            Discard
        </button>
    `);
    const saveButton = $(`
        <!-- submit button -->
        <button type="submit" class="submit-btn btn btn-primary btn-sm ml-2">
            Save
        </button>
    `);

    // Append buttons to the .right-area div
    $('.right-area').append(discardButton, saveButton);

    // Bind click events to the new buttons
    saveButton.on('click', function(e) {
        e.preventDefault();
        isSaveClicked = true;
        handleFormSubmission(survey);
    });

    discardButton.on('click', function(e) {
        e.preventDefault();

        $('.form-group input:visible').each(function() {
            if (this.type === 'radio' || this.type === 'checkbox') {
                this.checked = false;
            } else {
                $(this).val('');
            }
        });
        // Clear all visible select fields
        $('.form-group select:visible').each(function() {
            $(this).val('');
        });
        // Clear all visible textarea fields
        $('.form-group textarea:visible').each(function() {
            $(this).val('');
        });
        // Reset star ratings
        $('.star-rating:visible').each(function() {
            $(this).find('input').val('0');
            $(this).find('.star').removeClass('selected');
        });
    });
}

function showSuccessPage() {
    $('.web-form-container').hide();
    $('.success-page').removeClass('hide');
    $('.success-footer').hide();

    // Update the success page content.
    $('.success-title').text("Survey Expired");
    $('.success-message').text("The survey is not available at this time. Please check the survey dates.");
    $('.success-icon use').attr('href', '#icon-solid-warning'); // Update this to the appropriate icon identifier
}
