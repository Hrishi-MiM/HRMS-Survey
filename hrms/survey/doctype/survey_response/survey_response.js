frappe.ui.form.on('Survey Response', {
    refresh: function(frm) {
        // Extract the survey response ID from the URL
        const surveyResponseId = getSurveyResponseIdFromUrl();
        if (surveyResponseId) {
            // Fetch the survey response and then display it
            fetchSurveyResponse(surveyResponseId, function(response) {
                clearDynamicFields(frm);
                displaySurveyResponse(response, frm);
            });
        } else {
            frappe.msgprint("Survey Response ID not found in URL.");
        }
    }
});

/**
 * Extract the survey response ID from the current URL.
 * @returns {string|null} The survey response ID or null if not found.
 */
function getSurveyResponseIdFromUrl() {
    const urlParts = window.location.href.split('/');
    return urlParts[urlParts.length - 1] || null;
}

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
                console.log(r.message);
                callback(r.message);
            } else {
                frappe.msgprint("Failed to fetch survey response.");
            }
        }
    });
}

/**
 * Clear all dynamically added fields from the form.
 * @param {Object} frm - The current form object.
 */
function clearDynamicFields(frm) {
    // Ensure the correct selector is used to find and remove dynamic fields
    $(frm.fields_dict.submission_date.wrapper).find('.dynamic-field').remove();
}

/**
 * Display the survey response in a read-only format.
 * @param {Object} response - The survey response data.
 * @param {Object} frm - The current form object.
 */
function displaySurveyResponse(response, frm) {
    // Hide all fields except Submission Date and Employee
    Object.keys(frm.fields_dict).forEach(function(fieldname) {
        if (fieldname !== 'submission_date' && fieldname !== 'employee') {
            frm.set_df_property(fieldname, 'hidden', true);
        } else {
            frm.set_df_property(fieldname, 'hidden', false);
        }
    });

    // Loop through answers and create fields for each one
    response.answers.forEach(function(answer) {
        let field = frappe.ui.form.make_control({
            df: {
                fieldname: answer.question_text.toLowerCase().replace(/\s+/g, '_'),
                label: answer.question_text,
                fieldtype: 'Data',
                read_only: true
            },
            parent: frm.fields_dict.submission_date.wrapper,
            render_input: true
        });

        field.set_value(answer.answer);
        field.refresh();

        // Add a class to identify these fields for future removal
        $(field.wrapper).addClass('dynamic-field');
    });

    frm.refresh_fields();
}
