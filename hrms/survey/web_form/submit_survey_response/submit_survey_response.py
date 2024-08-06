import frappe
from frappe import _
import json

def get_context(context):
    # This function will be used to pass any necessary context to the web form
    pass

@frappe.whitelist()
def get_survey_response(survey_response_id):
    try:
        survey_response = frappe.get_doc("Survey Response", survey_response_id)
        answers = frappe.get_all("Survey Answer", filters={"survey_response": survey_response_id}, fields=["survey_question", "answer"])
        answers.reverse()
        
        # Fetch survey title
        survey = frappe.get_doc("Survey", survey_response.survey)
        survey_title = survey.title
        desc = survey.description

        # Fetch question text for each answer
        for answer in answers:
            question = frappe.get_doc("Survey Question", answer.survey_question)
            answer["question_text"] = question.question_text
        
        response_data = {
            "survey": survey_title,
            "desc": desc,
            "employee": survey_response.employee,
            "submission_date": survey_response.submission_date,
            "answers": answers
        }
        return response_data
    except frappe.PermissionError:
        frappe.throw(_("You do not have permission to access this survey response."), frappe.PermissionError)


@frappe.whitelist()
def get_survey_questions(survey_id):
    try:
        survey = frappe.get_doc("Survey", survey_id)
        
        return {"survey": survey}
    except frappe.PermissionError:
        frappe.throw(_("You do not have permission to access these survey questions."), frappe.PermissionError)
 
@frappe.whitelist()
def submit_survey_response(survey_response):
    survey_response = json.loads(survey_response)
    survey_response_doc = frappe.get_doc({
        "doctype": "Survey Response",
        "survey": survey_response.get('survey'),
        "employee": survey_response.get('employee'),
        "submission_date": survey_response.get('submission_date')
    })
    survey_response_doc.insert()

    # Extract answers and save
    answers = []
    ques_ans = survey_response.get("answers")
    for question, answer in ques_ans.items():
        question = question.replace("question_", "")
        answer_doc = frappe.get_doc({
            "doctype": "Survey Answer",
            "survey_response": survey_response_doc.name,
            "survey_question": question,
            "answer": answer
        })
        answer_doc.insert()
        answers.append(answer_doc)

    return {"survey_response": survey_response_doc.name, "answers": answers}
