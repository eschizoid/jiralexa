/**
 * Lambda function for handling Alexa Skill requests that uses Jira REST api through JQL (Jira Query Language):
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask Jira what's the number of open tickets for CAMEL?"
 *  Alexa: "(queries Jira REST api and finds the number of tickets)"
 */

'use strict';

var AlexaSkill = require('./AlexaSkill');

var config = require('./config');

var request = require('request');

var appId = config.appId;

var JirAlexa = function () {
    AlexaSkill.call(this, appId);
};

JirAlexa.prototype = Object.create(AlexaSkill.prototype);
JirAlexa.prototype.constructor = JirAlexa;

JirAlexa.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    var speechText = "Welcome to the Bug Tracker. You can ask a question like, what's the number of open tickets for Kafka?... Now, what can I help you with.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "For instructions on what you can say, please say help me.";
    response.ask(speechText, repromptText);
};

JirAlexa.prototype.intentHandlers = {
    "GetTicketStatus": function (intent, session, alexaResponse) {
        var projectSlot = intent.slots.Project;
        var ticketNumberSlot = intent.slots.TicketNumber;
        var rangeSlot = intent.slots.Range;
        var hasProject = projectSlot && projectSlot.value;

        var hasTicketNumber = ticketNumberSlot && ticketNumberSlot.value;
        var hasRange = rangeSlot && rangeSlot.value;

        if (!hasProject) {
            speechOutput = {
                speech: "<speak>" + "I'm sorry, I couldn't find the information you were looking for." + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            alexaResponse.tell(speechOutput);
        }

        var jql, speechOutput, speech;

        if (hasTicketNumber) {
            jql = "key=" + projectSlot.value.toUpperCase() + "-" + ticketNumberSlot.value.toString();
        } else {
            if (hasRange) {
                jql = "project=" + projectSlot.value.toUpperCase() + " AND resolutiondate >= startOfDay(" + "-" + rangeSlot.value.toString() + ")";
            } else {
                jql = "project=" + projectSlot.value.toUpperCase() + " AND status in (Open, \"In Progress\", Reopened) ORDER BY created DESC";
            }
        }

        console.log(jql);

        request({
            url: config.endpoint,
            method: "POST",
            json: true,
            body: {
                "jql": jql,
                "maxResults": config.maxResults
            },
            headers: {
                "Authorization": "Basic " + (new Buffer(config.username + ":" + config.password)).toString("base64"),
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                if (hasTicketNumber) {
                    speech = "<speak>I'm sorry, I I couldn't find the status for the ticket: " + projectSlot.value.toUpperCase() + " - " + "<say-as interpret-as='digits'/>" + ticketNumberSlot.value.toString() + "</say-as></speak>";
                } else {
                    speech = "<speak>I'm sorry, I I couldn't find the status for the project: " + projectSlot.value.toUpperCase() + "</speak>";
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.tell(speechOutput);
            } else {
                console.log(response.statusCode, body);
                if (response.statusCode === 200) {
                    if (hasTicketNumber) {
                        if (body.total === 0) {
                            speech = "<speak>I'm sorry, I couldn't find the the status for the ticket " + projectSlot.value + " - " + "<say-as interpret-as='digits'/>" + ticketNumberSlot.value.toString() + "</say-as></speak>";
                        } else {
                            speech = "" +
                                "<speak>" +
                                "<p>The Summary for ticket " + projectSlot.value + "<say-as interpret-as='digits'>" + ticketNumberSlot.value + "</say-as>" + " is the following:</p>" +
                                "<p>Description:<break time='0.5s'/>" + body.issues[0].fields.summary + "</p>" +
                                "<p>Priority:<break time='0.5s'/>" + body.issues[0].fields.priority.name + "</p>" +
                                "<p>Reporter:<break time='0.5s'/>" + body.issues[0].fields.reporter.name + "</p>" +
                                "<p>Type:<break time='0.5s'/>" + body.issues[0].fields.issuetype.name + "</p>" +
                                "<p>Status:<break time='0.5s'/>" + body.issues[0].fields.status.name + "</p>" +
                                "</speak>";
                        }
                        speechOutput = {
                            speech: speech,
                            type: AlexaSkill.speechOutputType.SSML
                        };
                        alexaResponse.tell(speechOutput);
                    } else {
                        speechOutput = {
                            speech: "<speak>There are<break strength='medium'/>" + body.total + " tickets found with the specified criteria</speak>",
                            type: AlexaSkill.speechOutputType.SSML
                        };
                        alexaResponse.tell(speechOutput);
                    }
                } else {
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't find the information you were looking for." + "</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tell(speechOutput);
                }
            }
        });
    },
    "GetDeveloperStatus": function (intent, session, alexaResponse) {
        var usernameSlot = intent.slots.Username;
        var projectSlot = intent.slots.Project;
        var statusSlot = intent.slots.Status;

        var hasUsername = usernameSlot && usernameSlot.value;
        var hasProject = projectSlot && projectSlot.value;
        var hasStatus = statusSlot && statusSlot.value;

        if (!hasUsername || !hasProject) {
            speechOutput = {
                speech: "<speak>" + "I'm sorry, I couldn't find the information you were looking for." + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            alexaResponse.tell(speechOutput);
        }

        var jql, speechOutput, speech;

        if (hasStatus) {
            jql = "project=" + projectSlot.value.toUpperCase() + " AND status = '" + statusSlot.value + "' AND assignee = '" + usernameSlot.value + "'";
        } else {
            jql = "project=" + projectSlot.value.toUpperCase() + " AND status in (Open, \"In Progress\", Reopened) " + " AND assignee = '" + usernameSlot.value + "'" + " ORDER BY created DESC";
        }

        console.log(jql);

        request({
            url: config.endpoint,
            method: "POST",
            json: true,
            body: {
                "jql": jql,
                "maxResults": config.maxResults
            },
            headers: {
                "Authorization": "Basic " + (new Buffer(config.username + ":" + config.password)).toString("base64"),
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                if (hasStatus) {
                    speech = "<speak>I'm sorry, I couldn't find tickets related to the user " + usernameSlot.value + " and project " + projectSlot.value.toUpperCase() + " with status " + statusSlot.value + "</speak>";
                } else {
                    speech = "<speak>I'm sorry, I couldn't find tickets related to the user " + statusSlot.value + " and project " + projectSlot.value.toUpperCase() + "</speak>";
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.tell(speechOutput);
            } else {
                console.log(response.statusCode, body);
                if (response.statusCode === 200) {
                    speechOutput = {
                        speech: "<speak>There are<break strength='medium'/>" + body.total.toString() + " tickets found with the specified criteria</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                } else {
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't find the information you were looking for." + "</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                }
                alexaResponse.tell(speechOutput);
            }
        });
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "You can ask questions about Ticket Status such as, what's the number of open tickets for Kafka, or, you can say exit... Now, what can I help you with?";
        var repromptText = "You can say things like, what's the number of open tickets for Kafka, or you can say exit... Now, what can I help you with?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    }
};

exports.handler = function (event, context) {
    var jirAlexa = new JirAlexa();
    jirAlexa.execute(event, context);
};
