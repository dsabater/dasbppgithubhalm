var context;


function DGSM_js_onLoad(executionContext) {
    // Fired on loading the form
    context = executionContext;
    var formContext = executionContext.getFormContext();

    //set dgsm_contactdepartment as read-only
    formContext.getControl("dgsm_contactdepartment").setDisabled(true);

    // Set the customer lookup to only show account records
    if (formContext.getControl("customerid").getEntityTypes().length >= 1) {
        formContext.getControl("customerid").setEntityTypes(['account']);
    }
    if (formContext.getAttribute("parentcaseid").getValue() != null) {
        formContext.getControl("WebResource_Documents_Parent").setVisible(true);
    }
    else {
        formContext.getControl("WebResource_Documents_Parent").setVisible(false);
    }

    // Filter the Account lookup view
    DGSM_dgsm_accountid_SetFilter(executionContext);

    // Filter the Task lookup view
    DGSM_dgsm_taskid_SetFilter(executionContext);

    DGSM_dgsm_taskid_SetFilter_ChildCase(executionContext);
    //Only in quick form load

    //Change the value of the new mail Flag
    DGSM_js_changeNewMailFlagToNo(formContext);
    //Change the value of the close Children case Flag
    DGSM_js_changeResolveChildCaseFlagToNo(formContext);
    //fill the original Queue value
    DGSM_js_fillOriginalQueueValue(formContext);
    // control resolve section
    DGSM_MdExecutionTask(executionContext);
    //Set the contacttype value
    DGSM_Set_Contact_Type_Value(executionContext);
    //if the task has only ones subtask, set as default
    DGSM_setDefaultSubtask(executionContext);
}

function DGSM_setDefaultSubtask(executionContext) {

    var formContext = executionContext.getFormContext();
    if ((formContext.getAttribute("dgsm_casesubtaskid").getValue() == "" || formContext.getAttribute("dgsm_casesubtaskid").getValue() == null) && formContext.getAttribute("dgsm_taskid").getValue() != null) {
        formContext.getAttribute("dgsm_casesubtaskid").setRequiredLevel("required");
        var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0].id;
        parent.Xrm.WebApi.retrieveMultipleRecords("dgsm_casesubtask", "?$select=dgsm_name,dgsm_casesubtaskid,_dgsm_casetaskid_value&$filter=_dgsm_casetaskid_value eq " + taskid + " and statuscode eq 1").then(
            function successR(_retrievedSubTasks) {
                if (_retrievedSubTasks.entities.length == 1) {
                    parent.Xrm.WebApi.retrieveRecord("dgsm_casesubtask", _retrievedSubTasks.entities[0].dgsm_casesubtaskid, "?$select=dgsm_name,dgsm_casesubtaskid").then(
                        function successR(_Subtask) {
                            var subTask = new Array();
                            subTask[0] = new Object();
                            subTask[0].name = _Subtask.dgsm_name;
                            subTask[0].id = "{" + _Subtask.dgsm_casesubtaskid + "}";
                            subTask[0].entityType = "dgsm_casesubtask";
                            formContext.getAttribute("dgsm_casesubtaskid").setValue(subTask);
                            // formContext.getControl("dgsm_taskid").setDisabled(true);
                            formContext.getAttribute("dgsm_casesubtaskid").setSubmitMode("always");
                            formContext.getAttribute("dgsm_casesubtaskid").fireOnChange();
                        },
                        function (error) {
                            DGSM_HandleError(error.message);

                        }
                    );
                }

            },
            function (error) {
                DGSM_HandleError(error.message);

            }
        );
    }
    else {
        formContext.getAttribute("dgsm_casesubtaskid").setRequiredLevel("none");
    }
    //DGSM_SetFormFields(executionContext);
}

function DGSM_js_onSave_QuickCreate(executionContext) {
    formContext = executionContext.getFormContext();
    formContext.getAttribute("statuscode").setValue(697250001);
    DGSM_selecTemplate(executionContext);
}

function DGSM_js_onLoad_QuickCreate(executionContext) {
    // Fired on loading the quick create form

    formContext = executionContext.getFormContext();

    // Filter the Task lookup view
    DGSM_dgsm_taskid_SetFilter(executionContext);

    //Quick create from case form: creation of child case
    if (formContext.getAttribute("parentcaseid").getValue() != null) {

        //Sections and fields visibility
        formContext.ui.tabs.get("tab_1").sections.get("tab_1_section_childcase").setVisible(true);
        formContext.ui.tabs.get("tab_1").sections.get("tab_1_section_newcase").setVisible(false);
        formContext.getAttribute("dgsm_taskid").setRequiredLevel("required");
        formContext.getAttribute("ownerid").setRequiredLevel("none");
        formContext.getAttribute("customerid").setRequiredLevel("none");
        //Origin is Child Case
        formContext.getAttribute("caseorigincode").setValue(697250000);

        //Title
        var currentTitle = formContext.getAttribute("title").getValue();
        if (currentTitle != null && currentTitle != "")
            formContext.getAttribute("title").setValue("Child Case - " + currentTitle);

        // Filter the Task lookup view
        DGSM_dgsm_taskid_SetFilter_ChildCase(executionContext);
    }
    //Quick create from global ribbon: creation of new case
    else {

        //Sections and fields visibility
        formContext.ui.tabs.get("tab_1").sections.get("tab_1_section_childcase").setVisible(false);
        formContext.ui.tabs.get("tab_1").sections.get("tab_1_section_newcase").setVisible(true);
        formContext.getAttribute("dgsm_taskid").setRequiredLevel("required");
        formContext.getAttribute("dgsm_accountid").setRequiredLevel("required");
        formContext.getAttribute("primarycontactid").setRequiredLevel("required");
        formContext.getAttribute("customerid").setRequiredLevel("none");

        //Set filter in Account field
        formContext.getAttribute("dgsm_accountfilter").setValue(true);

        //Set "Worked By" to the current user
        var globalContext = Xrm.Utility.getGlobalContext();

        var currentUser = new Array();
        currentUser[0] = new Object();
        currentUser[0].entityType = "systemuser";
        currentUser[0].id = globalContext.userSettings.userId;
        currentUser[0].name = globalContext.userSettings.userName;

        formContext.getAttribute("dgsm_workedbyid").setValue(currentUser);
        //Filter Task
        DGSM_dgsm_taskid_SetFilter_ManualCase(executionContext);
    }
}

function DGSM_js_ribbon_Show_AssignWorkedBy() {
    // Set the visibility of the "Assign Worked By" button in the form ribbon
    // The button is visible in update mode when: the "Worked By" field is not filled
    // or when it's filled with a different user that user in session.

    //if (formContext.ui.getFormType() == 2) {//Update
    //    var fieldWorkedBy = formContext.getControl("dgsm_workedbyid").getAttribute();
    //    if (fieldWorkedBy.getValue() === null) {
    //        return true;
    //    }
    //    else {
    //        var fieldWorkedById = formContext.getControl("dgsm_workedbyid").getAttribute().getValue()[0].id.toUpperCase().replace('{', '').replace('}', '');
    //        var globalContext = Xrm.Utility.getGlobalContext();
    //        var currentUserId = globalContext.userSettings.userId.toUpperCase().replace('{', '').replace('}', '');

    //        if (fieldWorkedById != currentUserId) {
    //            return true;
    //        }
    //    }
    //}
    return false;
}

function DGSM_js_ribbon_OnClick_AssignWorkedBy(formContext) {
    // Fired on pressing the "Assign Worked By" button in the form ribbon
    // Get the current user in session to set the "Worked By". Then
    // saves the form and refreshes the ribbon.

    var globalContext = Xrm.Utility.getGlobalContext();
    var currentUser = new Array();
    currentUser[0] = new Object();
    currentUser[0].entityType = "systemuser";
    currentUser[0].id = globalContext.userSettings.userId;
    currentUser[0].name = globalContext.userSettings.userName;

    formContext.getAttribute("dgsm_workedbyid").setValue(currentUser);

    formContext.data.entity.save();
    formContext.ui.refreshRibbon();
}

function DGSM_js_ribbonHome_Show_AssignWorkedBy(SelectedItems, SelectedControl) {
    // Set the visibility of the "Assign Worked By" button in the home ribbon.
    // Returns true to show the button.

    // The button is visible in the following views:

    var viewName = SelectedControl.getViewSelector().getCurrentView().name.toUpperCase();

    //    viewName == "CASES PENDING DISTRIBUTION" ||
    //    viewName == "DISTRIBUTED CASES WAITING FOR AGENT") 

    if (viewName == "MY CASES" ||
        viewName == "ACTIVE CASES" ||
        viewName == "ALL ACTIVE CASES" ||
        viewName.startsWith("ALL CASES") ||
        // added prefix "CTR_" to improve teams to get "assign worked by" in personal views
        viewName.startsWith("CTR_") ||
        viewName == "AVAILABLE CASES" ||
        viewName == "MY WORKING CASES" ||
        viewName == "ALL WORKING CASES FROM MY TEAMS" ||
        viewName == "AVAILABLE CASES" ||
        viewName == "MY WORKING CASES" ||
        viewName == "WORKING CASES FROM MY TEAMS") {


        return true;
    }

    return false;
}

async function DGSM_js_ribbonHome_OnClick_AssignWorkedBy(SelectedItems, SelectedControl) {
    // Fired on pressing the "Assign Worked By" button in the home ribbon

    //Get all cases id
    var casesIDs = "";
    var casesTeamFetch = "";
    for (var i = 0; i < SelectedItems.length; i++) {
        casesIDs += SelectedItems[i].Id + ";";
        casesTeamFetch += "<value uitype='incident'>{" + SelectedItems[i].Id + "}</value>";
    }

    if (casesIDs != "") {

        //Check if all selected cases are assigned to the same owning team
        var FetchtXMLTeams = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
            "  <entity name='team'>" +
            "    <attribute name='name' />" +
            "    <attribute name='businessunitid' />" +
            "    <attribute name='teamid' />" +
            "    <attribute name='teamtype' />" +
            "    <order attribute='name' descending='false' />" +
            "    <link-entity name='incident' from='owningteam' to='teamid' link-type='inner' alias='ad'>" +
            "      <filter type='and'>" +
            "        <condition attribute='incidentid' operator='in'>" + casesTeamFetch +
            "        </condition>" +
            "      </filter>" +
            "    </link-entity>" +
            "  </entity>" +
            "</fetch>";

        var fetchXmlRequest = "?fetchXml=" + encodeURIComponent(FetchtXMLTeams);

        var caseTeamsCount = 0;
        var caseOwningTeamID = "";
        await Xrm.WebApi.retrieveMultipleRecords("team", fetchXmlRequest).then(
            function success(result) {
                caseTeamsCount = result.entities.length;
                caseOwningTeamID = result.entities[0].teamid;
            },
            function (error) {
                var alertMessage = { text: error.message };
                Xrm.Navigation.openAlertDialog(alertMessage, null);
            }
        );
        if (caseTeamsCount != 1) {
            var alertStrings = { confirmButtonLabel: "Ok", text: "It's not possible to massively assign the 'Worked By' to cases with different owner teams.", title: "Alert" };
            var alertOptions = { height: 120, width: 260 };
            Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
            return;
        }

        //Open window to assign the Worked By
        //All cases id's and owning team as parameter
        var data = {};
        data["dgsm_selectedcases"] = casesIDs;
        data["dgsm_selectedteam"] = caseOwningTeamID;

        var pageInput = { pageType: "entityrecord", entityName: "dgsm_caseassignment", data };
        var navigationOptions = { target: 2, position: 1, width: { value: 40, unit: "%" }, height: { value: 55, unit: "%" } };

        Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
            function success() {
                SelectedControl.refresh();
            },
            function () {
                SelectedControl.refresh();
            }
        );
    }
}

function DGSM_js_ribbonHome_Show_ReactivateChildCase(SelectedItems, SelectedControl) {

    //var viewName = SelectedControl.getViewSelector().getCurrentView().name.toUpperCase();

    //if (viewName == "ALL CASES") {
    //    return true;
    //}

    return false;
}

async function DGSM_js_ribbonHome_OnClick_ReactivateChildCase(SelectedItems, SelectedControl) {
    // Fired on pressing the "Reactivate Child" button in the home ribbon

    //Get all cases id
    var casesIDs = "";

    if (SelectedItems.length == 1) {
        casesIDs = SelectedItems[0].Id;

        //Open window to assign the Worked By
        //All cases id's and owning team as parameter
        var resolveText = prompt("Please provide a comment for the reopened child case:");
        if (resolveText.length > 5) {
            await Xrm.WebApi.updateRecord("incident", casesIDs, { "dgsm_reopenchild": true, "dgsm_communicationnewmessage": resolveText }).then(
                function success() {
                    SelectedControl.refresh();
                },
                function () {
                    SelectedControl.refresh();
                }
            );
        }
        else {
            alert("Please provide a valid description (at least 5 characters) and try again.")
        }

        // var data = {};
        // data["notetext"] = casesIDs;

        // var pageInput = { pageType: "entityrecord", entityName: "annotation", data };
        // var navigationOptions = { target: 2, position: 1, width: { value: 40, unit: "%" }, height: { value: 55, unit: "%" } };

        // Xrm.Navigation.navigateTo(pageInput, navigationOptions).then(
        //     function success() {
        //         SelectedControl.refresh();
        //     },
        //     function () {
        //         SelectedControl.refresh();
        //     }
        // );
    }
}

function DGSM_js_ribbonHome_Show_ReleaseWorkedBy(SelectedItems, SelectedControl) {
    // Set the visibility of the "Release Worked By" button in the home ribbon.
    // Same logic as "Assign Worked By" Button

    return DGSM_js_ribbonHome_Show_AssignWorkedBy(SelectedItems, SelectedControl);
}

async function DGSM_js_ribbonHome_OnClick_ReleaseWorkedBy(SelectedItems, SelectedControl) {
    // Fired on pressing the "Release Worked By" button in the home ribbon.
    // Clear the "Worked By" value for each selected case.

    for (var i = 0; i < SelectedItems.length; i++) {
        //Update record
        await Xrm.WebApi.updateRecord("incident", SelectedItems[i].Id, { "dgsm_workedbyid": null }).then(
            function success() {
                SelectedControl.refresh();
            },
            function () {
                SelectedControl.refresh();
            }
        );
    }
}

function DGSM_js_ribbonHome_Show_CancelCase(SelectedItems, SelectedControl) {
    //Function ready to add any validation for the "Cancel Case Button Enable Rule". Default true.
    return true;
}

async function DGSM_js_ribbonHome_OnClick_CancelCases(SelectedItems, SelectedControl) {

    for (var i = 0; i < SelectedItems.length; i++) {
        var parameters = {};
        var entity = {};
        entity.id = SelectedItems[i].Id;
        entity.entityType = "incident";
        parameters.entity = entity;
        //Define data to update
        var data = {
            "dgsm_cancelcase": true
        }
        
        //Update record
        await Xrm.WebApi.updateRecord("incident", SelectedItems[i].Id, data).then(
            function success(result) {
                SelectedControl.refresh();
            },
            function (error) {
                var alertMessage = { text: error.message };
                Xrm.Navigation.openAlertDialog(alertMessage, null);
            }
        );
    }
}

function DGSM_ShowField(formContext, fieldname) {
    try {
        formContext.getControl(fieldname).setVisible(true);
    }
    catch (err) {
        console.error(err.message);
    }
}

function DGSM_HideField(formContext, fieldname) {
    try {
        formContext.getControl(fieldname).setVisible(false);
    }
    catch (err) {
        console.error(err.message);
    }
}

function DGSM_DeleteValue(formContext, fieldname) {
    try {
        if (formContext.getAttribute(fieldname).getAttributeType() === "boolean") {
            formContext.getAttribute(fieldname).setValue(false);
        }
        else {
            formContext.getAttribute(fieldname).setValue(null);
        }
    }
    catch (err) {
        console.error(err.message);
    }
}

function DGSM_SetFieldRecommended(formContext, fieldname) {
    try {
        formContext.getAttribute(fieldname).setRequiredLevel("recommended");
    }
    catch (err) {
        console.error(err.message);
    }
}

function DGSM_SetFieldNotRecommended(formContext, fieldname) {
    try {
        formContext.getAttribute(fieldname).setRequiredLevel("none");
    }
    catch (err) {
        console.error(err.message);
    }
}

function DGSM_ConfigField(executionContext, fieldname, visible, recommended) {
    var formContext = executionContext.getFormContext();
    try {
        if (visible) {
            DGSM_ShowField(formContext, fieldname);
        }
        else {
            DGSM_HideField(formContext, fieldname)
        }

        if (recommended) {
            DGSM_SetFieldRecommended(formContext, fieldname);
        }
        else {
            DGSM_SetFieldNotRecommended(formContext, fieldname);
        }
    }
    catch (err) {
        console.error(err.message);
        return "";
    }
}
//InProgress
async function DGSM_SetFormFieldsInProgress(executionContext) {
    try {
        var formContext = executionContext.getFormContext();
        var caseOrigin = formContext.getAttribute("caseorigincode").getValue();
        var visAmmendVendorComments = false;

        DGSM_ConfigField(executionContext, "dgsm_invoicestatus", false, false);
        DGSM_ConfigField(executionContext, "dgsm_documentrequest", false, false);
        DGSM_ConfigField(executionContext, "dgsm_customervendorid", false, false);
        DGSM_ConfigField(executionContext, "dgsm_solution", false, false);
        DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);
        DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
        

        if (formContext.getAttribute("dgsm_taskid").getValue() != null && formContext.getAttribute("statuscode").getValue() != 697250000) {

            var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0];

            var normalizedTaskId = taskid.name.toLowerCase();

            var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0].id;

            switch (normalizedTaskId) {
                case "md execution":
                    DGSM_ConfigField(executionContext, "dgsm_vendordetailsconfirmamend", (caseOrigin == 3) ? true : false, false);
                    break;
            }

            await parent.Xrm.WebApi.retrieveMultipleRecords("dgsm_requiredfieldconfiguration", "?$select=dgsm_fieldname,dgsm_visible,dgsm_recommended,dgsm_casestatus&$filter=(_dgsm_taskid_value eq  '" + taskid + "' and dgsm_casestatus eq 697250002)").then(
                function success(result) {
                    // var visiblefields = "";
                    // var recommendedfields = "";
                    if (result.entities.length > 0) {
                        for (var i = 0; i < result.entities.length; i++) {
                            DGSM_ConfigField(executionContext, result.entities[i].dgsm_fieldname, result.entities[i].dgsm_visible, result.entities[i].dgsm_recommended);
                        }
                        //validateStatusRequirements(executionContext)
                    }
                    else {
                        plantillaGuid = "0";
                    }
                    // alert("TEST\nVisible fields:" + visiblefields + "\n---\n Recommended fields:" + recommendedfields);
                },
                function (error) {
                    alert("ERROR" + error.message)

                });
        }
        else {
            DGSM_ConfigField(executionContext, "dgsm_invoicestatus", false, false);
            DGSM_ConfigField(executionContext, "dgsm_documentrequest", false, false);
            DGSM_ConfigField(executionContext, "dgsm_customervendorid", false, false);
            DGSM_ConfigField(executionContext, "dgsm_solution", false, false);
            DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);
            DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
        }
    }
    catch (error) {
        console.error(error.message);
        return "";
    }
}
//Identify & New
async function DGSM_SetFormFields(executionContext) {
    try {
        var formContext = executionContext.getFormContext();
        var documentNumber = formContext.getAttribute("dgsm_documentnumber").getValue();
        var amount = formContext.getAttribute("dgsm_amount").getValue();
        var vinNumber = formContext.getAttribute("dgsm_vinnumber").getValue();
        var plateNumber = formContext.getAttribute("dgsm_platenumber").getValue();
        
        // DGSM_ConfigField(executionContext, "dgsm_documentnumber", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_amount", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_startdate", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_enddate", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_months", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_comments", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_vendorcode", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_vinnumber", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_platenumber", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_multiplequeries", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_mileage", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_casebu", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_chasis", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_dunningletter", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_dunninglevel", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_requester", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_invoicecompany", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);
        // DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);

        
        if (formContext.getAttribute("dgsm_taskid").getValue() != null && formContext.getAttribute("statuscode").getValue() != 697250000) {

            var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0].id;

            var reqDocNum = false;
            var reqVinNum = false;
            var reqPlaNum = false;
            var reqAmount = false;
            var normalizedTaskName = formContext.getAttribute("dgsm_taskid").getValue()[0].name.toLowerCase();

            switch (normalizedTaskName) {
                //Tasks from SC;
                case "contract copy request":
                    reqDocNum = (vinNumber === null && plateNumber === null) ? true : false;
                    reqVinNum = (documentNumber === null && plateNumber === null) ? true : false;
                    reqPlaNum = (vinNumber === null && documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    break;
                case "info request_sc":
                    reqDocNum = (vinNumber === null && plateNumber === null) ? true : false;
                    reqVinNum = (documentNumber === null && plateNumber === null) ? true : false;
                    reqPlaNum = (vinNumber === null && documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    break;
                case "contract creation/activation":
                    reqDocNum = (vinNumber === null && plateNumber === null) ? true : false;
                    reqVinNum = (documentNumber === null && plateNumber === null) ? true : false;
                    reqPlaNum = (vinNumber === null && documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    formContext.getAttribute("dgsm_accountfilter").setValue(true);
                    formContext.getAttribute("dgsm_accountfilter").setSubmitMode("always");
                    formContext.getAttribute("dgsm_accountfilter").fireOnChange();
                    break;
                case "contract prolongation/adaptation":
                    reqDocNum = (vinNumber === null && plateNumber === null) ? true : false;
                    reqVinNum = (documentNumber === null && plateNumber === null) ? true : false;
                    reqPlaNum = (vinNumber === null && documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    break;
                case "contract termination/suspension":
                    reqDocNum = (vinNumber === null && plateNumber === null) ? true : false;
                    reqVinNum = (documentNumber === null && plateNumber === null) ? true : false;
                    reqPlaNum = (vinNumber === null && documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    break;
                case "commissions":
                    reqVinNum = (plateNumber === "") ? true : false;
                    reqPlaNum = (vinNumber === "") ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_vinnumber", true, reqVinNum);
                    DGSM_ConfigField(executionContext, "dgsm_platenumber", true, reqPlaNum);
                    break;

                case "payment and collection_sc":
                    
                    reqDocNum = (amount === null) ? true : false;
                    reqAmount = (documentNumber === null) ? true : false;
                    DGSM_ConfigField(executionContext, "dgsm_documentnumber", true, reqDocNum);
                    DGSM_ConfigField(executionContext, "dgsm_amount", true, reqAmount);
                    break;
            }
            
            await parent.Xrm.WebApi.retrieveMultipleRecords("dgsm_requiredfieldconfiguration", "?$select=dgsm_fieldname,dgsm_visible,dgsm_recommended,dgsm_casestatus&$filter=(_dgsm_taskid_value eq  '" + taskid + "' and dgsm_casestatus eq 697250001)").then(
                function success(result) {
                    // var visiblefields = "";
                    // var recommendedfields = "";
                    if (result.entities.length > 0) {
                        for (var i = 0; i < result.entities.length; i++) {
                            DGSM_ConfigField(executionContext, result.entities[i].dgsm_fieldname, result.entities[i].dgsm_visible, result.entities[i].dgsm_recommended);
                        }
                    }
                    else {
                        plantillaGuid = "0";
                    }
                    validateStatusRequirements(executionContext);
                    // alert("TEST\nVisible fields:" + visiblefields + "\n---\n Recommended fields:" + recommendedfields);
                },
                function (error) {
                    alert("ERROR" + error.message)

                });
        }
        else { // Status New
            DGSM_ConfigField(executionContext, "dgsm_documentnumber", false, false);
            DGSM_ConfigField(executionContext, "dgsm_amount", false, false);
            DGSM_ConfigField(executionContext, "dgsm_startdate", false, false);
            DGSM_ConfigField(executionContext, "dgsm_enddate", false, false);
            DGSM_ConfigField(executionContext, "dgsm_months", false, false);
            DGSM_ConfigField(executionContext, "dgsm_comments", false, false);
            DGSM_ConfigField(executionContext, "dgsm_vendorcode", false, false);
            DGSM_ConfigField(executionContext, "dgsm_vinnumber", false, false);
            DGSM_ConfigField(executionContext, "dgsm_platenumber", false, false);
            //DGSM_ConfigField(executionContext, "dgsm_customervendorid", false, false);
            DGSM_ConfigField(executionContext, "dgsm_multiplequeries", false, false);
            DGSM_ConfigField(executionContext, "dgsm_mileage", false, false);
            DGSM_ConfigField(executionContext, "dgsm_casebu", false, false);
            DGSM_ConfigField(executionContext, "dgsm_chasis", false, false);
            DGSM_ConfigField(executionContext, "dgsm_dunningletter", false, false);
            DGSM_ConfigField(executionContext, "dgsm_dunninglevel", false, false);
            DGSM_ConfigField(executionContext, "dgsm_requester", false, false);
            DGSM_ConfigField(executionContext, "dgsm_invoicecompany", false, false);
            DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);
            DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
            if (formContext.getAttribute("dgsm_taskid").getValue() != null) {

                var normalizedTaskName = formContext.getAttribute("dgsm_taskid").getValue()[0].name.toLowerCase();
                if (normalizedTaskName == "contract creation/activation") {
                    formContext.getAttribute("dgsm_accountfilter").setValue(true);
                    formContext.getAttribute("dgsm_accountfilter").setSubmitMode("always");
                    formContext.getAttribute("dgsm_accountfilter").fireOnChange();
                }
            }
            //formContext.getAttribute("dgsm_accountfilter").setValue(false);
        }
    }
    catch (error) {
        console.error(error.message);
        return "";
    }
}

function DGSM_js_onLoad_InvoiceBasware(executionContext) {
    var formContext = executionContext.getFormContext();
    if (formContext.getAttribute("dgsm_taskid").getValue() == null) return;
    var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0];
    if (formContext.getAttribute("dgsm_taskid").getValue() != null) {
        var normalizedTaskId = taskid.name.toLowerCase();
        if (normalizedTaskId.startsWith("invoice to basware") || normalizedTaskId.startsWith("invoice to scan")) {
            formContext.getControl("dgsm_invoicecompany").setVisible(true);
            formContext.getAttribute("dgsm_invoicecompany").setRequiredLevel("recommended");
        } else {
            formContext.getControl("dgsm_invoicecompany").setVisible(false);
            formContext.getAttribute("dgsm_invoicecompany").setRequiredLevel("none");
        }
    }
}

function statusReason_OnChange(executionContext, newStatusReason) {
    if (executionContext != undefined) {
        var formContext = executionContext.getFormContext();
        formContext.ui.tabs.get("general").sections.get("resolve").setVisible(false);
        formContext.ui.tabs.get("general").sections.get("identify").setVisible(false);
        

        var status = (newStatusReason === null || newStatusReason == undefined) ? formContext.getAttribute("statuscode").getValue(false) : newStatusReason;

        switch (status) {
            case 697250000: //New
                formContext.ui.tabs.get("general").sections.get("identify").setVisible(false);
                DGSM_clearIdentifyFields(formContext);
                formContext.ui.tabs.get("general").sections.get("resolve").setVisible(false);

                if (!formContext.getAttribute("dgsm_useidentifytemplate").getValue() == false) {
                    formContext.getAttribute("dgsm_useidentifytemplate").setValue(false);
                }
                formContext.getControl("dgsm_useidentifytemplate").setVisible(false);
                if (formContext.getAttribute("dgsm_emailtemplateid").getValue() != null) {
                    formContext.getAttribute("dgsm_emailtemplateid").setValue(null);
                }
                DGSM_selecTemplate(context);
                break;
            case 697250001: //Pending Identification
                //DGSM_selecTemplate(context);
                // formContext.getAttribute("dgsm_emailtemplateid").setValue(result);
                // formContext.getAttribute("dgsm_emailtemplateid").setSubmitMode("always");
                formContext.ui.tabs.get("general").sections.get("identify").setVisible(true);
                formContext.ui.tabs.get("general").sections.get("resolve").setVisible(false);
                if (!formContext.getAttribute("dgsm_useidentifytemplate").getValue() == false) {
                    formContext.getAttribute("dgsm_useidentifytemplate").setValue(false);
                }
                formContext.getControl("dgsm_useidentifytemplate").setVisible(false);
                DGSM_ConfigField(executionContext, "dgsm_invoicestatus", false, false);
                DGSM_ConfigField(executionContext, "dgsm_documentrequest", false, false);
                DGSM_ConfigField(executionContext, "dgsm_customervendorid", false, false);
                DGSM_ConfigField(executionContext, "dgsm_solution", false, false);
                DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);
                DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
                DGSM_selecTemplate(context);
                break;
            case 1: //In Progress
                // formContext.getAttribute("dgsm_emailtemplateid").setValue(result);
                // formContext.getAttribute("dgsm_emailtemplateid").setSubmitMode("always");
                formContext.ui.tabs.get("general").sections.get("identify").setVisible(true);
                formContext.ui.tabs.get("general").sections.get("resolve").setVisible(true);
                if (!formContext.getAttribute("dgsm_useidentifytemplate").getValue() == false) {
                    formContext.getAttribute("dgsm_useidentifytemplate").setValue(false);
                }
                DGSM_SetFormFieldsInProgress(executionContext);
                formContext.getControl("dgsm_useidentifytemplate").setVisible(true);
                DGSM_selecTemplate(context);
                break;
            default:
                formContext.ui.tabs.get("general").sections.get("identify").setVisible(true);

                var invoiceStatus = formContext.getAttribute("dgsm_invoicestatus").getValue();
                var documentRequest = formContext.getAttribute("dgsm_documentrequest").getValue();
                var customerVendorId = formContext.getAttribute("dgsm_customervendorid").getValue();
                var solution = formContext.getAttribute("dgsm_solution").getValue();
                var terminationreason = formContext.getAttribute("dgsm_terminationreason").getValue();

                if ((invoiceStatus != null && invoiceStatus != "") || (documentRequest != null && documentRequest != "") || (customerVendorId != null && customerVendorId != "") || (solution != null && solution != "") || (terminationreason != null && terminationreason != "")) {
                    formContext.ui.tabs.get("general").sections.get("resolve").setVisible(true);

                    DGSM_ConfigField(executionContext, "dgsm_invoicestatus", false, false);
                    DGSM_ConfigField(executionContext, "dgsm_documentrequest", false, false);
                    DGSM_ConfigField(executionContext, "dgsm_customervendorid", false, false);
                    DGSM_ConfigField(executionContext, "dgsm_solution", false, false);
                    DGSM_ConfigField(executionContext, "dgsm_terminationreason", false, false);

                    if (invoiceStatus != null && invoiceStatus != "") {
                        DGSM_ConfigField(executionContext, "dgsm_invoicestatus", true, false);
                    }
                    if (documentRequest != null && documentRequest != "") {
                        DGSM_ConfigField(executionContext, "dgsm_documentrequest", true, false);
                    }
                    if (customerVendorId != null && customerVendorId != "") {
                        DGSM_ConfigField(executionContext, "dgsm_customervendorid", true, false);
                    }
                    if (solution != null) {
                        DGSM_ConfigField(executionContext, "dgsm_solution", true, false);
                    }
                    if (terminationreason != null && terminationreason != "") {
                        DGSM_ConfigField(executionContext, "dgsm_terminationreason", true, false);
                        if (formContext.getAttribute("dgsm_terminationreason").getValue() == 697250008) {
                            DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", true, false);
                        } else {
                            DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
                        }
                    }
                }

                if (!formContext.getAttribute("dgsm_useidentifytemplate").getValue() == false) {
                    formContext.getAttribute("dgsm_useidentifytemplate").setValue(false);
                }
                formContext.getControl("dgsm_useidentifytemplate").setVisible(false);
                break;
        }
    }
}

async function DGSM_dgsm_accountid_SetFilter(executionContext) {
    // Modify the lookup default view to show only the desired accounts.
    // Accounts are filtered with the primarycontactid field.
    // The Account Filter field controls what records will be showed in the lookup view.
    // If Account Filter is false: Show accounts related with the contact with same queue's "Activity" and parent account related to "Customer"
    // If Account Filter is true: Show all accounts with same queue's "Activity" and parent account related to "Customer"

    var formContext = executionContext.getFormContext();

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //formContext.getAttribute("dgsm_accountfilter").setSubmitMode("never");
    //var taskid2 = formContext.getAttribute("dgsm_taskid").getValue()[0];
    //var NameTask = taskid2.name.toLowerCase();

    var viewName = "";
    var fetchXmlFilter = "";
    var accountFilter = false;
    if (formContext.getAttribute("dgsm_accountfilter") != null) accountFilter = formContext.getAttribute("dgsm_accountfilter").getValue();


    //Filter with the "Customer" and the Incoming Queue's "Activity" 
    if (formContext.getAttribute("dgsm_incomingqueueid").getValue() != null && formContext.getAttribute("customerid").getValue() != null) {

        var activityId = "";
        var activityName = "";

        //Get the Customer guid
        var relatedCustomerId = formContext.getAttribute("customerid").getValue()[0].id;

        //Select the customer type according to the Activity
        //AP: Account type "Vendor". AR or SC: Account type "Customer"
        var task = formContext.getAttribute("dgsm_taskid").getValue();
        if (task != null && task != undefined) {

            //Retrieve the Task Activity ID
            await parent.Xrm.WebApi.retrieveRecord("dgsm_casetask", task[0].id, "?$select=_dgsm_activityid_value").then(
                function successR(_task) {
                    activityId = _task._dgsm_activityid_value;
                },
                function (error) {
                    console.log(error.message);
                }
            );
            //Retrieve the Task Activity Name
            await parent.Xrm.WebApi.retrieveRecord("dgsm_caseactivity", activityId, "?$select=dgsm_name").then(
                function successR(_activity) {
                    activityName = _activity.dgsm_name;
                },
                function (error) {
                    console.log(error.message);
                }
            );
        }
        //f (formContext.getAttribute("dgsm_taskid").getValue()[0].toLowerCase == "contract creation/activation"){ 
        //formContext.getAttribute("dgsm_accountfilter").setValue(true);
        //}

        //Filter by account type -> Customer (697250000): AR, SC, AS / Vendor (697250001): AP, AS / Company (697250002)
        var filterAccountType = "";
        if (activityName.toUpperCase() == "AP") {
            formContext.getAttribute("dgsm_accountid").setRequiredLevel("recommended");
            filterAccountType = "    <condition attribute='dgsm_customertype' operator='eq' value='697250001' />";
        }
        else if (activityName.toUpperCase() == "AR" || activityName.toUpperCase() == "SC") {
            formContext.getAttribute("dgsm_accountid").setRequiredLevel("recommended");
            filterAccountType = "    <condition attribute='dgsm_customertype' operator='eq' value='697250000' />";
        }
        else if (activityName.toUpperCase() == "AS") {
            formContext.getAttribute("dgsm_accountid").setRequiredLevel("recommended");
            filterAccountType = "<condition attribute='dgsm_customertype' operator='in'>" +
                "  <value>697250000</value>" +
                "  <value>697250001</value>" +
                "</condition>";
        }
        else if (
            activityName.toUpperCase() == "EXCELLENCE" ||
            activityName.toUpperCase() == "WA" ||
            activityName.toUpperCase() == "SM" ||
            activityName.toUpperCase() == "CSS" ||
            activityName.toUpperCase() == "FA" ||
            activityName.toUpperCase() == "FS-AS") {
            formContext.getAttribute("dgsm_accountid").setRequiredLevel("none");
        }

        if (accountFilter) {
            viewName = "Available accounts";
            fetchXmlFilter = "<filter type='and'>" +
                filterAccountType +
                "    <condition attribute='parentaccountid' operator='eq' uitype='account' value='" + relatedCustomerId + "' />" +
                "</filter>";
        }
        else if (!accountFilter) {
            var contactFieldId = "";
            if (formContext.getAttribute("primarycontactid").getValue() != null) contactFieldId = formContext.getAttribute("primarycontactid").getValue()[0].id;

            viewName = "Accounts Related to Contact";
            fetchXmlFilter = "<filter type='and'>" +
                filterAccountType +
                "    <condition attribute='parentaccountid' operator='eq' uitype='account' value='" + relatedCustomerId + "' />" +
                "</filter>" +
                "<link-entity name='dgsm_account_contact' from='accountid' to='accountid' visible='false' intersect='true'>" +
                "    <link-entity name='contact' from='contactid' to='contactid' alias='ab'>" +
                "        <filter type='and'>" +
                "            <condition attribute='contactid' operator='eq' uitype='contact' value='" + contactFieldId + "' />" +
                "        </filter>" +
                "    </link-entity>" +
                "</link-entity>";

        }
    }

    //Build the custom lookup view
    var fetchXML = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
        "<entity name='account'>" +
        "<attribute name='name' />" +
        "<attribute name='dgsm_name2' />" +
        "<attribute name='dgsm_customercode' />" +
        "<attribute name='dgsm_vendorcustomercode' />" +
        "<attribute name='dgsm_vatregno' />" +
        "<attribute name='emailaddress1' />" +
        "<attribute name='telephone1' />" +
        "<attribute name='dgsm_countryid' />" +
        "<attribute name='accountid' />" +
        "<order attribute='name' descending='false' />" +
        fetchXmlFilter +
        "</entity>" +
        "</fetch>";

    var layoutXML = "<grid name='resultset' object='1' jump='name' select='1' preview='0' icon='1'>" +
        "<row name='result' id='accountid'>" +
        "<cell name='name' width='300' />" +
        "<cell name='dgsm_name2' width='200' />" +
        "<cell name='dgsm_customercode' width='100' />" +
        "<cell name='dgsm_vendorcustomercode' width='150' />" +
        "<cell name='dgsm_vatregno' width='100' />" +
        "<cell name='emailaddress1' width='200' />" +
        "<cell name='telephone1' width='100' />" +
        "<cell name='dgsm_countryid' width='100' />" +
        "</row>" +
        "</grid>";

    //Set custom lookup view as default
    var viewId = formContext.getControl("dgsm_accountid").getDefaultView();
    formContext.getControl("dgsm_accountid").addCustomView(viewId, "account", viewName, fetchXML, layoutXML, true);
}

function DGSM_primarycontactid_OnChange(executionContext) {
    var formContext = executionContext.getFormContext();

    // Filter the Account lookup view
    DGSM_dgsm_accountid_SetFilter(executionContext);

    //Clear department
    formContext.getAttribute("dgsm_contactdepartment").setSubmitMode("always");
    formContext.getAttribute("dgsm_contactdepartment").setValue(null);
}

function DGSM_dgsm_accountfilter_OnChange(executionContext) {
    // Filter the Account lookup view
    DGSM_dgsm_accountid_SetFilter(executionContext);
}

function DGSM_dgsm_taskid_OnChange(executionContext) {
    // Check incoming queue and task relationship
    DGSM_Validate_IncomingQueueAndTask_Case(executionContext)

    // Filter the Account lookup view
    DGSM_dgsm_accountid_SetFilter(executionContext);

    //if the task has only ones subtask, set as default
    DGSM_setDefaultSubtask(executionContext);
}
async function DGSM_dgsm_incomingqueueid_OnChange(executionContext) {
    // Filter the Task lookup view
    await DGSM_dgsm_taskid_SetFilter(executionContext);
    await DGSM_dgsm_taskid_SetFilter_ChildCase(executionContext);
    await DGSM_dgsm_taskid_SetFilter_ManualCase(executionContext);

    // Set Customer and rest of related with queue fields
    await DGSM_customerid_setField(executionContext)

    // Check incoming queue and task relationship
    DGSM_Validate_IncomingQueueAndTask_Case(executionContext)

    // Filter the Account lookup view
    await DGSM_dgsm_accountid_SetFilter(executionContext);

}

async function DGSM_customerid_setField(executionContext) {
    //Set the Customer according to the Related Customer of the Incoming Queue
    var formContext = executionContext.getFormContext();

    if (formContext.getAttribute("customerid").getValue() === null && formContext.getAttribute("dgsm_incomingqueueid").getValue() != null) {

        //Creation
        if (formContext.ui.getFormType() == 1) {
            var queueId = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id;
            var relatedCustomerId = "";
            var relatedCustomerName = "";

            //Retrieve the queue's Related Customer
            await Xrm.WebApi.retrieveRecord("queue", queueId, "?$select=_dgsm_relatedcustomerid_value").then(
                function success(result) {
                    if (result._dgsm_relatedcustomerid_value != null) {
                        relatedCustomerId = result._dgsm_relatedcustomerid_value;
                    }
                },
                function (error) {
                    console.log(error.message);
                }
            );
            if (relatedCustomerId != "") {
                await Xrm.WebApi.retrieveRecord("account", relatedCustomerId, "?$select=name").then(
                    function success(result) {
                        if (result.name != null) {
                            relatedCustomerName = result.name;
                        }
                    },
                    function (error) {
                        console.log(error.message);
                    }
                );

                //Set customer
                var customerReference = new Array();
                customerReference[0] = new Object();
                customerReference[0].entityType = "account";
                customerReference[0].id = relatedCustomerId;
                customerReference[0].name = relatedCustomerName;

                formContext.getAttribute("customerid").setValue(customerReference);
            }
        }
        else {
            var queueId = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id;
            var relatedCustomerId = "";
            var relatedCustomerName = "";
            //formContext.getAttribute("dgsm_taskid").setValue(null);
            //formContext.getAttribute("dgsm_workedbyid").setValue(null);
            //Retrieve the queue's Related Customer, language, bussiness, type, activity.... 
            await Xrm.WebApi.retrieveRecord("queue", queueId, "?$select=_dgsm_activityid_value,_dgsm_businessid_value,_dgsm_countryid_value,_dgsm_languageid_value,_dgsm_relatedcustomerid_value,_dgsm_typeid_value").then(
                function success(result) {

                    //relatedCustomerId = result._dgsm_relatedcustomerid_value;
                    //Incoming queue Activity
                    if (result._dgsm_activityid_value != null) {
                        var activityReference = new Array();
                        activityReference[0] = new Object();
                        activityReference[0].id = result["_dgsm_activityid_value"]; // Lookup
                        activityReference[0].name = result["_dgsm_activityid_value@OData.Community.Display.V1.FormattedValue"];
                        activityReference[0].entityType = result["_dgsm_activityid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        formContext.getAttribute("dgsm_activityid").setValue(activityReference);
                    }
                    else {
                        formContext.getAttribute("dgsm_activityid").setValue(null);
                    }
                    //Business
                    if (result._dgsm_businessid_value != null) {
                        var businessReference = new Array();
                        businessReference[0] = new Object();
                        businessReference[0].id = result["_dgsm_businessid_value"]; // Lookup
                        businessReference[0].name = result["_dgsm_businessid_value@OData.Community.Display.V1.FormattedValue"];
                        businessReference[0].entityType = result["_dgsm_businessid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        formContext.getAttribute("dgsm_businessid").setValue(businessReference);
                    }
                    else {
                        formContext.getAttribute("dgsm_businessid").setValue(null);
                    }
                    //Country 
                    //var countryReference = new Array();
                    //countryReference[0] = new Object();
                    //countryReference[0].id = result["_dgsm_countryid_value"]; 
                    //countryReference[0].name = result["_dgsm_countryid_value@OData.Community.Display.V1.FormattedValue"];
                    //countryReference[0].entityType = result["_dgsm_countryid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                    //Language
                    if (result._dgsm_languageid_value != null) {
                        var languageReference = new Array();
                        languageReference[0] = new Object();
                        languageReference[0].entityType = result["_dgsm_languageid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        languageReference[0].id = result["_dgsm_languageid_value"];
                        languageReference[0].name = result["_dgsm_languageid_value@OData.Community.Display.V1.FormattedValue"];
                        formContext.getAttribute("dgsm_languageid").setValue(languageReference);
                    }
                    else {
                        formContext.getAttribute("dgsm_languageid").setValue(null);
                    }
                    //Customer
                    if (result._dgsm_relatedcustomerid_value != null) {
                        var customerReference = new Array();
                        customerReference[0] = new Object();
                        customerReference[0].entityType = result["_dgsm_relatedcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        customerReference[0].id = result["_dgsm_relatedcustomerid_value"]
                        customerReference[0].name = result["_dgsm_relatedcustomerid_value@OData.Community.Display.V1.FormattedValue"];
                        formContext.getAttribute("customerid").setValue(customerReference);
                    }
                    else {
                        formContext.getAttribute("customerid").setValue(null);
                    }
                    //type
                    if (result._dgsm_typeid_value != null) {
                        var typeReference = new Array();
                        typeReference[0] = new Object();
                        typeReference[0].id = result["_dgsm_typeid_value"]; // Lookup
                        typeReference[0].name = result["_dgsm_typeid_value@OData.Community.Display.V1.FormattedValue"];
                        typeReference[0].entityType = result["_dgsm_typeid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                        formContext.getAttribute("dgsm_typeid").setValue(typeReference);
                    }
                    else {
                        formContext.getAttribute("dgsm_typeid").setValue(null);
                    }
                    //clear task, subtask & workedby fields
                    formContext.getAttribute("dgsm_taskid").setValue(null);
                    formContext.getAttribute("dgsm_casesubtaskid").setValue(null);
                    formContext.getAttribute("dgsm_workedbyid").setValue(null);

                },
                function (error) {
                    console.log(error.message);
                }
            );
        }

    }
    else if (formContext.getAttribute("customerid").getValue() != null && formContext.getAttribute("dgsm_incomingqueueid").getValue() === null) {
        // Clear the value
        formContext.getAttribute("customerid").setValue(null);
        formContext.getAttribute("customerid").setRequiredLevel("none");
    }
}

function validateStatusRequirements(executionContext) {

    var formContext = executionContext.getFormContext();
    var iqActivity = formContext.getAttribute("dgsm_activityid").getValue();
    var activityName = "";
    var subTask = formContext.getAttribute("dgsm_casesubtaskid").getValue();
    var account = formContext.getAttribute("dgsm_accountid").getValue();
    var accountExcluded = false;
    var statusReason = formContext.getAttribute("statuscode").getValue();
    var requiredFields = new Array();
    var recommendedFields = new Array();
    var recommendedCompleted = true;
    var countRequired = 0;
    var countRecommended = 0;
    var task = formContext.getAttribute("dgsm_taskid").getValue();
    
    formContext.data.entity.attributes.forEach(function (attribute, index) {
        if (attribute.getRequiredLevel() == "required") {
            requiredFields[countRequired] = attribute.getName();
            countRequired++;
        }
        else if (attribute.getRequiredLevel() == "recommended") {

            recommendedFields[countRecommended] = attribute.getName();
            countRecommended++;
        }
    });
    recommendedFields.forEach(function (field, index) {
        if (formContext.getAttribute(field).getValue() === null || formContext.getAttribute(field).getValue() === "") {
            recommendedCompleted = false;
        }
    });
    //New = 697250000
    //Pending Identification = 697250001
    //In Progress = 1
    if (iqActivity != null || iqActivity != undefined) {
        if (task != null) {
            activityName = iqActivity[0].name;
            taskName = task[0].name;
            //Try to get Activity from quick view control
            var quickViewControl = formContext.ui.quickForms.get("dgsm_taskActivity");
            if (quickViewControl != undefined) {
                if (quickViewControl.isLoaded()) {
                    // Access the value of the attribute bound to the constituent control
                    var myValue = quickViewControl.getControl(0).getAttribute().getValue();

                    // Search by a specific attribute present in the control       
                    activityName = quickViewControl.getControl().find(control => control.getName() == "dgsm_activityid").getAttribute().getValue()[0].name;
                }
            }
        }

        if (activityName.toUpperCase() == "EXCELLENCE" || activityName.toUpperCase() == "WA" || activityName.toUpperCase() == "SM" || activityName.toUpperCase() == "CSS" || activityName.toUpperCase() == "FA" || activityName.toUpperCase() == "FS-AS") {
            accountExcluded = true
        }

        if ((subTask != null && (account != null || accountExcluded) && statusReason == 697250000) || ((!recommendedCompleted || subTask === null || (account === null && !accountExcluded)) && statusReason == 1)) {
            if (taskName != "Financial GL Accounting ES FS" && subTask != null) {
                formContext.getAttribute("statuscode").setValue(697250001);
                statusReason_OnChange(executionContext, 697250001);
            }
        }
        else if ((subTask === null || (account === null && !accountExcluded)) && statusReason == 697250001) {
            formContext.getAttribute("statuscode").setValue(697250000);
            statusReason_OnChange(executionContext, 697250000);
        }
        else if (recommendedCompleted && subTask != null && (account != null || accountExcluded) && statusReason == 697250001) {
            formContext.getAttribute("statuscode").setValue(1);
            statusReason_OnChange(executionContext, 1);
        }
    }
}

function DGSM_showResolveButton(formContext) {

    caseStatus = formContext.getAttribute("statuscode").getValue();
    if (caseStatus == 1) {
        return (true);
    }
    else {
        return (false);
    }
}

function DGSM_showCreateChildButton(formContext) {
    if (formContext.getAttribute("statuscode").getValue() != null) {
        var caseStatus = formContext.getAttribute("statuscode").getValue();
    }

    if (formContext.getAttribute("ownerid").getValue() != null) {
        var ownerName = formContext.getAttribute("ownerid").getValue()[0].name;
        if (ownerName.substring(ownerName.length - 2) == "AG" && (caseStatus == 697250001 || caseStatus == 1)) {
            return (true);
        }
        else {
            return (false);
        }
    }
}

async function DGSM_createMail(formContext) {
    //Logic for the "Create Mail" button

    if (formContext.getAttribute("primarycontactid").getValue() === null) {
        var alertStrings = { confirmButtonLabel: "Ok", text: "The 'Contact' field is not filled.", title: "Alert" };
        var alertOptions = { height: 120, width: 260 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        return;
    }

    if (Xrm.Page.data.entity.getIsDirty()) {
        var alertStrings = { confirmButtonLabel: "Ok", text: "Save the record before creating the email.", title: "Alert" };
        var alertOptions = { height: 120, width: 260 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        return;
    }

    var windowOptions = {
        openInNewWindow: true
    };
    var parameters = {};
    var template;
    //var plantilla = {};
    var plantillaGuid;
    var numCorreoSel = 0;
    var guidCorreoSel = " ";
    //mirar los correos seleccionados en el grid.
    var selectedRows = formContext.getControl("dgsm_grid_emailmessages").getGrid().getSelectedRows();
    selectedRows.forEach(function (selectedRow, i) {
        guidCorreoSel = selectedRow.getData().getEntity().getId();
        numCorreoSel = numCorreoSel + 1;
    });
    if (numCorreoSel > 1) {
        var alertStrings = { confirmButtonLabel: "Ok", text: "More than one email selected.", title: "Alert" };
        var alertOptions = { height: 120, width: 260 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        return;
    }

    template = formContext.getAttribute("dgsm_emailtemplateid").getValue();

    if (template === null) {

        plantillaGuid = "0";

    }
    else {
        var plantillaNombre = formContext.getAttribute("dgsm_emailtemplateid").getValue()[0].name;
        await Xrm.WebApi.retrieveMultipleRecords("template", "?$select=templateid&$filter=(title eq '" + plantillaNombre + "')").then(
            function success(result) {
                if (result.entities.length > 0) {
                    plantillaGuid = result.entities[0].templateid;
                }
                else {
                    plantillaGuid = "0";
                }
            },
            function (error) {
                alert(error)

            });
    }
    
    var attachmentsids = DGSM_getSelectedAttachments();
    parameters["parameter_regardingid"] = formContext.data.entity.getId();
    parameters["parameter_regardingname"] = formContext.getAttribute("title").getValue();
    parameters["parameter_regardingtype"] = "incident";
    parameters["subject"] = formContext.getAttribute("title").getValue() + " - " + formContext.getAttribute("ticketnumber").getValue();
    parameters["parameter_toid"] = formContext.getAttribute("primarycontactid").getValue()[0].id;
    parameters["parameter_toname"] = formContext.getAttribute("primarycontactid").getValue()[0].name;
    parameters["parameter_toentitytype"] = formContext.getAttribute("primarycontactid").getValue()[0].entityType;
    parameters["parameter_plantilla"] = plantillaGuid;
    parameters["parameter_mailToRespond"] = guidCorreoSel;
    parameters["parameter_fromid"] = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id;
    parameters["parameter_fromname"] = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].name;
    parameters["parameter_fromentitytype"] = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].entityType;
    parameters["parameter_languageid"] = formContext.getAttribute("dgsm_languageid").getValue()[0].id;
    if (plantillaGuid != "0" && plantillaGuid != null) {
        parameters["parameter_templateSelectorName"] = formContext.getAttribute("dgsm_emailtemplateid").getValue()[0].name;
        parameters["parameter_templateSelectorId"] = formContext.getAttribute("dgsm_emailtemplateid").getValue()[0].id;
    }
    parameters["parameter_attachmentlist"] = attachmentsids;//"6AA87636-3228-ED11-9DB2-000D3A08543D;4537E63C-3228-ED11-9DB2-000D3A08543D"
    parameters["parameter_originalqueue"] = formContext.getAttribute("dgsm_originalqueueid").getValue()[0].id;
    Xrm.Utility.openEntityForm("email", null, parameters); // windowOptions);
}

function DGSM_selecTemplate(executionContext) {

    formContext = executionContext.getFormContext();

    if (formContext.getAttribute("dgsm_taskid").getValue() === null) {
        if (formContext.getAttribute("dgsm_emailtemplateid").getValue() != null) {
            formContext.getAttribute("dgsm_emailtemplateid").setValue(null);
        }
        return;
    }
    if (formContext.getAttribute("dgsm_taskid").getValue().length == 0) {
        if (formContext.getAttribute("dgsm_emailtemplateid").getValue() != null) {
            formContext.getAttribute("dgsm_emailtemplateid").setValue(null);
        }
        return;
    }
    var tareaId = formContext.getAttribute("dgsm_taskid").getValue()[0].id;
    var useidentifytemplate = formContext.getAttribute("dgsm_useidentifytemplate").getValue();
    var language = formContext.getAttribute("dgsm_languageid").getValue();
    if (language === null) {
        if (formContext.getAttribute("dgsm_emailtemplateid").getValue() != null) {
            formContext.getAttribute("dgsm_emailtemplateid").setValue(null);
        }
        return;
    }
    var languageId = language[0].id;
    var statusCode = formContext.getAttribute("statuscode").getValue();
    languageId = languageId.replace("{", "").replace("}", "");
    tareaId = tareaId.replace("{", "").replace("}", "");
    var multipleQueries = formContext.getAttribute("dgsm_multiplequeries").getValue();

    if (statusCode == 697250000) { //New
        templateType = "";
    }
    else if (statusCode == 697250001 || useidentifytemplate) { //Pending Identify
        templateType = "697250000";
    }

    else if ((statusCode == 1 || statusCode == 5) && !useidentifytemplate) { //In Progress or Resolved
        templateType = "697250001";
    }
    else if (statusCode == 6 || statusCode == 697250002 || statusCode == 697250003) { //Cancelled
        templateType = "";
    }

    if (templateType != "") {
        var req = new XMLHttpRequest();
        req.open("GET", Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/dgsm_templateselectors?$select=dgsm_templateselectorid,dgsm_name&$filter=(_dgsm_casetaskid_value eq " + tareaId + " and _dgsm_languageid_value eq " + languageId + " and dgsm_templatetype eq " + templateType + " and dgsm_multiplequeries eq " + multipleQueries + ")", false);
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Prefer", "odata.include-annotations=*");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var results = JSON.parse(this.response);
                    if (results.value.length > 0) {
                        var result = results.value[0];
                        // Columns
                        var dgsm_templateselectorid = result["dgsm_templateselectorid"]; // Guid
                        var dgsm_name = result["dgsm_name"]; // Text
                        templateSelectorValue = new Array();
                        templateSelectorValue[0] = new Object();
                        templateSelectorValue[0].id = dgsm_templateselectorid;
                        templateSelectorValue[0].name = dgsm_name;
                        templateSelectorValue[0].entityType = "dgsm_templateselector";
                        formContext.getAttribute("dgsm_emailtemplateid").setValue(templateSelectorValue);
                    }
                    else {
                        if (formContext.getAttribute("dgsm_emailtemplateid").getValue() != null) {
                            formContext.getAttribute("dgsm_emailtemplateid").setValue(null);
                        }
                        formContext.getAttribute("dgsm_emailtemplateid").setSubmitMode("always");
                    }
                } else {
                    alert("error");
                }
            }
        };
        req.send();
    }
}

function DGSM_js_onSave(executionContext) {
    // Fired on saving the form
    DGSM_AssignWorkedBy(executionContext);
    DGSM_Communication_Cases(executionContext);
    DGSM_VendorDetailsOnSave(executionContext);
}

function DGSM_AssignWorkedBy(executionContext) {
    var formContext = executionContext.getFormContext();
    var globalContext = Xrm.Utility.getGlobalContext();

    //Check for modified fields in form
    if (formContext.ui.getFormType() == 2 && formContext.data.entity.getIsDirty()) {

        //Return if user making changes is already assigned as "Worked By"
        if (formContext.getAttribute("dgsm_workedbyid").getValue() != null) {
            var currentUserId = globalContext.userSettings.userId.toUpperCase().replace('{', '').replace('}', '');
            var fieldWorkedById = formContext.getControl("dgsm_workedbyid").getAttribute().getValue()[0].id.toUpperCase().replace('{', '').replace('}', '');
        }

        //Get all form fields
        var formFields = formContext.data.entity.attributes.get();
        if (formFields === null) return;

        //Get list of all modified fields
        var dirtyFields = "";
        var dirtyCount = 0;
        var notTrackedFields = 0;
        var dirtyCountMBy = 0;
        var notTrackedFieldsMBy = 0;
        for (var i in formFields) {
            if (formFields[i].getIsDirty()) {
                var fieldName = formFields[i].getName();
                if (fieldName != "dgsm_taskid" && fieldName != "dgsm_casesubtaskid" && fieldName != "dgsm_emailtemplateid" && fieldName != "statuscode" && fieldName != "dgsm_closechildren" && fieldName != "dgsm_newmailflag" && fieldName != "dgsm_originalqueueid" && fieldName != "dgsm_invoicecompany" && fieldName != "dgsm_pmsrequest" && fieldName != "dgsm_pmsresponse") {
                    dirtyCount++;
                }
                if (fieldName != "dgsm_emailtemplateid" && fieldName != "dgsm_closechildren" && fieldName != "dgsm_newmailflag" && fieldName != "dgsm_originalqueueid" && fieldName != "dgsm_invoicecompany" && fieldName != "dgsm_pmsrequest" && fieldName != "dgsm_pmsresponse") {
                    dirtyCountMBy++;
                    notTrackedFields++;
                }

                dirtyFields += formFields[i].getName() + ";";
            }
        }
        if (dirtyCountMBy != 0) {
            //Assign Modified by User
            var currentUser = new Array();
            currentUser[0] = new Object();
            currentUser[0].entityType = "systemuser";
            currentUser[0].id = globalContext.userSettings.userId;
            currentUser[0].name = globalContext.userSettings.userName;
            formContext.getAttribute("dgsm_modifiedbyuserid").setValue(currentUser);
            var currentDate = new Date();
            formContext.getAttribute("dgsm_modifiedbyuserdate").setValue(currentDate);
        }
        //Return if "Task" is modified to assign the case
        if ((formContext.getAttribute("dgsm_workedbyid").getValue() === null && dirtyCount == 0) || notTrackedFields == 0) {
            return;
        }

        //Return if "Worked By" is modified
        if (dirtyFields.includes("dgsm_workedbyid")) {
            return;
        }

        //Set current user as "Worked By"
        var currentUser = new Array();
        currentUser[0] = new Object();
        currentUser[0].entityType = "systemuser";
        currentUser[0].id = globalContext.userSettings.userId;
        currentUser[0].name = globalContext.userSettings.userName;

        formContext.getAttribute("dgsm_workedbyid").setValue(currentUser);
    }
}

function DGSM_Validate_IncomingQueueAndTask_Case(executionContext) {
    var formContext = executionContext.getFormContext();

    var incomingQueue = formContext.getAttribute("dgsm_incomingqueueid").getValue();
    var caseTask = formContext.getAttribute("dgsm_taskid").getValue();
    if (caseTask === null || caseTask == undefined) {
        return;
    }
    if (incomingQueue === null || incomingQueue == undefined) {
        return;
    }
    var incomingQueueId = incomingQueue[0].id;
    incomingQueueId = incomingQueueId.replace("{", "").replace("}", "");
    var caseTaskId = caseTask[0].id;
    caseTaskId = caseTaskId.replace("{", "").replace("}", "");
    var fetchTeam = `<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>
        <entity name='team'>
            <attribute name='name' />
            <attribute name='businessunitid' />
            <attribute name='teamid' />
            <attribute name='teamtype' />
            <order attribute='name' descending='false' />
            <link-entity name='dgsm_team_queue' from='teamid' to='teamid' visible='false' intersect='true'>
                <link-entity name='queue' from='queueid' to='queueid' alias='ae'>
                    <filter type='and'>
                        <condition attribute='queueid' operator='eq' uitype='queue' value='{` + incomingQueueId + `}' />
                    </filter>
                </link-entity>
            </link-entity>
            <link-entity name='dgsm_team_dgsm_casetask' from='teamid' to='teamid' visible='false' intersect='true'>
                <link-entity name='dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' alias='ac'>
                    <filter type='and'>
                        <condition attribute='dgsm_casetaskid' operator='eq' uitype='dgsm_casetask' value='{` + caseTaskId + `}' />
                    </filter>
                </link-entity>
            </link-entity>
        </entity>
    </fetch>`;
    var encodedFetchXML = encodeURIComponent(fetchTeam);
    var fetchXmlRequest = "?fetchXml=" + encodedFetchXML;
    Xrm.WebApi.retrieveMultipleRecords("team", fetchXmlRequest).then(
        function success(result) {
            if (result.entities.length == 0) {
                var alertStrings = { confirmButtonLabel: "Ok", text: "No Valid team for this incoming queue and Task", title: "Alert" };
                var alertOptions = { height: 120, width: 260 };
                Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
                var caseTask = formContext.getAttribute("dgsm_taskid").setValue(null);
                var caseTask = formContext.getAttribute("dgsm_casesubtaskid").setValue(null);
            }
        },
        function (error) {
            var alertMessage = { text: error.message };
            Xrm.Navigation.openAlertDialog(alertMessage, null);
        }
    );
}

async function DGSM_dgsm_taskid_SetFilter(executionContext) {
    // Modify the lookup default view in Task to only display the tasks associated with case owning team
    // Filter applies when the Case has been distributed (the Case owning team is not the same as
    // the team associated to the Incoming Queue)

    var formContext = executionContext.getFormContext();

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //Not for Child cases
    if (formContext.getAttribute("parentcaseid").getValue() != null) return;

    if (formContext.getAttribute("dgsm_incomingqueueid").getValue() === null ||
        formContext.getAttribute("ownerid").getValue() === null)
        return;

    //Get the Incoming Queue id
    var caseIncomingQueueId = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id;

    //Get the Team id associated with the Incoming Queue
    var queueTeamId = "";
    var activityId = "";
    var dgsm_activityid_formatted = "";
    var dgsm_activityid_lookuplogicalname = "";
    await Xrm.WebApi.retrieveRecord("queue", caseIncomingQueueId, "?$select=_dgsm_teamid_value,_dgsm_activityid_value").then(
        function success(result) {
            if (result._dgsm_teamid_value != null) {
                queueTeamId = result._dgsm_teamid_value.toUpperCase().replace('{', '').replace('}', '');
            }
            if (result._dgsm_activityid_value != null) {
                activityId = result["_dgsm_activityid_value"];
                dgsm_activityid_formatted = result["_dgsm_activityid_value@OData.Community.Display.V1.FormattedValue"];
                dgsm_activityid_lookuplogicalname = result["_dgsm_activityid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
            }
        },
        function (error) {
            console.log(error.message);
        }
    );

    if (formContext.getAttribute("ownerid").getValue()[0].entityType != "team") {
        //Manual case, the owner is a user. Set the value of the activityField to filter the task lookup
        //Filters byteam and queue
        var activityReference = new Array();
        activityReference[0] = new Object();
        activityReference[0].id = activityId; // Lookup
        activityReference[0].name = dgsm_activityid_formatted;
        activityReference[0].entityType = dgsm_activityid_lookuplogicalname;
        formContext.getAttribute("dgsm_activityid").setValue(activityReference);
        var globalContext = Xrm.Utility.getGlobalContext();
        var currentUser = globalContext.userSettings.userId;
        //Search the tasks related to the teams the user is member of

        var viewName = "Available Case Tasks";

        var fetchXML = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
            "<entity name='dgsm_casetask'>" +
            "    <attribute name='dgsm_casetaskid' />" +
            "    <attribute name='dgsm_name' />" +
            "    <attribute name='createdon' />" +
            "    <attribute name='dgsm_activityid' />" +
            "    <order attribute='dgsm_name' descending='false' />" +
            "    <filter type='and'>" +
            "        <condition attribute='statuscode' operator='eq' value='1' />" +
            "    </filter>" +
            "    <link-entity name='dgsm_team_dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' visible='false' intersect='true'>" +
            "        <link-entity name='team' from='teamid' to='teamid' alias='ai'>" +
            "            <link-entity name='teammembership' from='teamid' to='teamid' visible='false' intersect='true'>" +
            "                <link-entity name='systemuser' from='systemuserid' to='systemuserid' alias='aj'>" +
            "                    <filter type='and'>" +
            "                        <condition attribute='systemuserid' operator='eq' uitype='systemuser' value='" + currentUser + "'  />" +
            "                    </filter>" +
            "                </link-entity>" +
            "            </link-entity>" +
            "        </link-entity>" +
            "    </link-entity>" +
            "</entity>" +
            "</fetch>"

        var layoutXML = "<grid name='dgsm_casetasks' object='10517' jump='dgsm_name' select='1' icon='1' preview='0'>" +
            "  <row name='dgsm_casetask' id='dgsm_casetaskid'>" +
            "    <cell name='dgsm_name' width='300' />" +
            "    <cell name='dgsm_activityid' width='100' />" +
            "  </row>" +
            "</grid>"
        //Set custom lookup view as default
        var viewId = formContext.getControl("dgsm_taskid").getDefaultView();
        formContext.getControl("dgsm_taskid").addCustomView(viewId, "dgsm_casetask", viewName, fetchXML, layoutXML, true);

        return;
    }

    //Get the case owning team id
    var caseOwnerTeam = formContext.getAttribute("ownerid").getValue();
    var caseOwnerTeamId = caseOwnerTeam[0].id.toUpperCase().replace('{', '').replace('}', '');

    //Build the custom lookup view if case is distributed
    if (queueTeamId != "" && queueTeamId != caseOwnerTeamId) {

        var viewName = "Available Case Tasks";

        var fetchXML = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
            "  <entity name='dgsm_casetask'>" +
            "    <attribute name='dgsm_casetaskid' />" +
            "    <attribute name='dgsm_name' />" +
            "    <attribute name='createdon' />" +
            "    <attribute name='dgsm_activityid' />" +
            "    <order attribute='dgsm_name' descending='false' />" +
            "    <link-entity name='dgsm_team_dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' visible='false' intersect='true'>" +
            "      <link-entity name='team' from='teamid' to='teamid' alias='au'>" +
            "        <filter type='and'>" +
            "          <condition attribute='teamid' operator='eq' uitype='team' value='{" + caseOwnerTeamId + "}' />" +
            "        </filter>" +
            "      </link-entity>"
        "  </entity>" +
            "</fetch>";

        var layoutXML = "<grid name='dgsm_casetasks' object='10517' jump='dgsm_name' select='1' icon='1' preview='0'>" +
            "  <row name='dgsm_casetask' id='dgsm_casetaskid'>" +
            "    <cell name='dgsm_name' width='300' />" +
            "    <cell name='dgsm_activityid' width='100' />" +
            "  </row>" +
            "</grid>"

        //Set custom lookup view as default
        var viewId = formContext.getControl("dgsm_taskid").getDefaultView();
        formContext.getControl("dgsm_taskid").addCustomView(viewId, "dgsm_casetask", viewName, fetchXML, layoutXML, true);
    }
}

async function DGSM_dgsm_taskid_SetFilter_ManualCase(executionContext) {
    // Filters on the manual case quick create Form
    //Incoiming queue: only queues of the team that the user belongs to
    //Task: If the Incoming queue is empty, only tasks of the teams that the user belongs to.
    //If there is incoming queue, tasks of the teams that the user belongs to and are related to the queue. 

    var formContext = executionContext.getFormContext();

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //Not for Child cases
    if (formContext.getAttribute("parentcaseid").getValue() != null) return;

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //Not for Child cases
    if (formContext.getAttribute("parentcaseid").getValue() != null) return;

    if (formContext.getAttribute("ownerid").getValue()[0].entityType != "team") {
        //Manual case, the owner is a user. Set the value of the activityField to filter the task lookup. No longer needed
        var globalContext = Xrm.Utility.getGlobalContext();
        var currentUser = globalContext.userSettings.userId;
        //Search the tasks related to the teams the user  & the incoming queue are members of
        var caseIncomingQueueId;
        var queueLinkEntityFetch = "";
        if (formContext.getAttribute("dgsm_incomingqueueid").getValue() != null) {
            //if the incoming queue has value, add the filter.
            caseIncomingQueueId = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id;
            queueLinkEntityFetch = "<link-entity name='dgsm_team_queue' from='teamid' to='teamid' visible='false' intersect='true'>" +
                "<link-entity name='queue' from='queueid' to='queueid' alias='au'>" +
                "   <filter type='and'>" +
                "        <condition attribute='queueid' operator='eq' uiname='pt.fornecedores@mercedes-benz.com' uitype='queue' value='" + caseIncomingQueueId + "' />" +
                "    </filter>" +
                "</link-entity> " +
                "</link-entity> ";

        }
        var viewName = "Available Case Tasks";

        var fetchXML = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
            "<entity name='dgsm_casetask'>" +
            "    <attribute name='dgsm_casetaskid' />" +
            "    <attribute name='dgsm_name' />" +
            "    <attribute name='createdon' />" +
            "    <attribute name='dgsm_activityid' />" +
            "    <order attribute='dgsm_name' descending='false' />" +
            "    <filter type='and'>" +
            "        <condition attribute='statuscode' operator='eq' value='1' />" +
            "    </filter>" +
            "    <link-entity name='dgsm_team_dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' visible='false' intersect='true'>" +
            "        <link-entity name='team' from='teamid' to='teamid' alias='ai'>" +
            "            <link-entity name='teammembership' from='teamid' to='teamid' visible='false' intersect='true'>" +
            "                <link-entity name='systemuser' from='systemuserid' to='systemuserid' alias='aj'>" +
            "                    <filter type='and'>" +
            "                        <condition attribute='systemuserid' operator='eq' uitype='systemuser' value='" + currentUser + "'  />" +
            "                    </filter>" +
            "                </link-entity>" +
            "            </link-entity>" +
            queueLinkEntityFetch +
            "        </link-entity>" +
            "    </link-entity>" +
            "</entity>" +
            "</fetch>";

        var layoutXML = "<grid name='dgsm_casetasks' object='10517' jump='dgsm_name' select='1' icon='1' preview='0'>" +
            "  <row name='dgsm_casetask' id='dgsm_casetaskid'>" +
            "    <cell name='dgsm_name' width='300' />" +
            "    <cell name='dgsm_activityid' width='100' />" +
            "  </row>" +
            "</grid>";
        //Set custom lookup view as default
        var viewId = formContext.getControl("dgsm_taskid").getDefaultView();
        formContext.getControl("dgsm_taskid").addCustomView(viewId, "dgsm_casetask", viewName, fetchXML, layoutXML, true);
        //Incoming queue
        var viewNameIq = "Available Incoming Queues";
        //Filter the incoming queue. Only queueues of the user teams are available
        var fetchXMLIq = " <fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'> " +
            "<entity name='queue'>" +
            "    <attribute name='name' /> " +
            "    <attribute name='emailaddress' />" +
            "    <attribute name = 'queueid' /> " +
            "    <attribute name='dgsm_activityid' />" +
            "    <order attribute='name' descending='false' />" +
            "    <link-entity name='dgsm_team_queue' from='queueid' to='queueid' visible='false' intersect='true'> " +
            "        <link-entity name='team' from='teamid' to='teamid' alias='ac'> " +
            "            <link-entity name='teammembership' from='teamid' to='teamid' visible='false' intersect='true'> " +
            "                <link-entity name='systemuser' from='systemuserid' to='systemuserid' alias='ad'> " +
            "                    <filter type='and'> " +
            "                       <condition attribute='systemuserid' operator='eq' uitype='systemuser' value='" + currentUser + "'  />" +
            "                    </filter> " +
            "                </link-entity> " +
            "            </link-entity>" +
            "        </link-entity> " +
            "    </link-entity> " +
            "</entity>" +
            " </fetch>";

        var layoutXMLIq = "<grid name='queues' object='2020' jump='name' select='1' icon='1' preview='0'>" +
            "  <row name='queue' id='queueid'>" +
            "    <cell name='name' width='300' />" +
            "    <cell name='dgsm_activityid' width='100' />" +
            "  </row>" +
            "</grid>";
        //Set custom lookup view as default
        var viewIdIq = formContext.getControl("dgsm_incomingqueueid").getDefaultView();
        formContext.getControl("dgsm_incomingqueueid").addCustomView(viewIdIq, "queue", viewNameIq, fetchXMLIq, layoutXMLIq, true);

    }

}

async function DGSM_dgsm_taskid_SetFilter_ChildCase(executionContext) {
    // Modify the lookup default view in Task to display all the case tasks, excluding these ones associated with case owning team
    // Filter applies when the Case is a Child Case

    var formContext = executionContext.getFormContext();

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //Only for Child Cases
    if (formContext.getAttribute("parentcaseid").getValue() === null) return;

    //Get incoming queue
    if (formContext.getAttribute("dgsm_incomingqueueid").getValue() === null) return;
    var queueId = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].id.replace("{", "").replace("}", "");

    //Retrieve the parent case owning team
    var parentCaseId = formContext.getAttribute("parentcaseid").getValue()[0].id.replace("{", "").replace("}", "");
    var parentCaseOwnerTeamId = "";
    await Xrm.WebApi.retrieveRecord("incident", parentCaseId, "?$select=_ownerid_value").then(
        function success(result) {
            if (result._ownerid_value != null) {
                parentCaseOwnerTeamId = result._ownerid_value;
            }
        },
        function (error) {
            console.log(error.message);
        }
    );
    if (parentCaseOwnerTeamId === "") return;

    //Get case tasks associated to parent case owning team
    var FetchtXMLparent = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
        "  <entity name='dgsm_casetask'>" +
        "    <attribute name='dgsm_casetaskid' />" +
        "    <attribute name='dgsm_name' />" +
        "    <attribute name='createdon' />" +
        "    <attribute name='dgsm_activityid' />" +
        "    <order attribute='dgsm_name' descending='false' />" +
        "    <link-entity name='dgsm_team_dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' visible='false' intersect='true'>" +
        "      <link-entity name='team' from='teamid' to='teamid' alias='ar'>" +
        "        <filter type='and'>" +
        "          <condition attribute='teamid' operator='eq' uitype='team' value='{" + parentCaseOwnerTeamId + "}' />" +
        "        </filter>" +
        "      </link-entity>" +
        "    </link-entity>" +
        "  </entity>" +
        "</fetch>";

    var fetchXmlRequest = "?fetchXml=" + encodeURIComponent(FetchtXMLparent);
    var parentCaseTasks = "";
    await Xrm.WebApi.retrieveMultipleRecords("dgsm_casetask", fetchXmlRequest).then(
        function success(result) {
            for (var i = 0; i < result.entities.length; i++) {
                parentCaseTasks += "<value uitype='dgsm_casetask'>{" + result.entities[i].dgsm_casetaskid + "}</value>";
            }
        },
        function (error) {
            var alertMessage = { text: error.message };
            Xrm.Navigation.openAlertDialog(alertMessage, null);
        }
    );
    if (parentCaseTasks === "") return;

    //Build the custom lookup view
    var viewName = "Available Case Tasks";

    var fetchXML = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
        "  <entity name='dgsm_casetask'>" +
        "    <attribute name='dgsm_casetaskid' />" +
        "    <attribute name='dgsm_name' />" +
        "    <attribute name='createdon' />" +
        "    <attribute name='dgsm_activityid' />" +
        "    <order attribute='dgsm_name' descending='false' />" +
        "    <filter type='and'>" +
        "      <condition attribute='dgsm_casetaskid' operator='not-in'>" + parentCaseTasks +
        "      </condition>" +
        "    </filter>" +
        "    <link-entity name='dgsm_team_dgsm_casetask' from='dgsm_casetaskid' to='dgsm_casetaskid' visible='false' intersect='true'>" +
        "      <link-entity name='team' from='teamid' to='teamid' alias='aw'>" +
        "        <link-entity name='dgsm_team_queue' from='teamid' to='teamid' visible='false' intersect='true'>" +
        "          <link-entity name='queue' from='queueid' to='queueid' alias='ax'>" +
        "            <filter type='and'>" +
        "              <condition attribute='queueid' operator='eq' uitype='queue' value='{" + queueId + "}' />" +
        "            </filter>" +
        "          </link-entity>" +
        "        </link-entity>" +
        "      </link-entity>" +
        "    </link-entity>" +
        "  </entity>" +
        "</fetch>";

    var layoutXML = "<grid name='dgsm_casetasks' object='10517' jump='dgsm_name' select='1' icon='1' preview='0'>" +
        "  <row name='dgsm_casetask' id='dgsm_casetaskid'>" +
        "    <cell name='dgsm_name' width='300' />" +
        "    <cell name='dgsm_activityid' width='100' />" +
        "  </row>" +
        "</grid>";

    //Set custom lookup view as default
    var viewId = formContext.getControl("dgsm_taskid").getDefaultView();
    formContext.getControl("dgsm_taskid").addCustomView(viewId, "dgsm_casetask", viewName, fetchXML, layoutXML, true);
}

function DGSM_js_changeNewMailFlagToNo(formContext) {

    if (formContext.getAttribute("dgsm_newmailflag").getValue()) {
        formContext.getAttribute("dgsm_newmailflag").setValue(false);
    }
}

function DGSM_js_changeResolveChildCaseFlagToNo(formContext) {

    if (formContext.getAttribute("dgsm_closechildren").getValue()) {
        formContext.getAttribute("dgsm_closechildren").setValue(false);
    }
}

function DGSM_js_fillOriginalQueueValue(formContext) {
    if (formContext.getAttribute("dgsm_originalqueueid").getValue() == null) {
        formContext.getAttribute("dgsm_originalqueueid").setValue(formContext.getAttribute("dgsm_incomingqueueid").getValue());
    }
}

function DGSM_getSelectedAttachments() {

    
    var attachmentGrid = Xrm.Page.getControl("WebResource_Documents").getObject().contentWindow.document;
    var selectedDocuments = attachmentGrid.getElementsByClassName("DGSM_SelectDocumentCheckBox");
    var checkbox = "";
    var files = "";
    var j = 0;
    try {
        for (var i = 0; i < selectedDocuments.length; i++) {
            if (selectedDocuments[i].checked) {
                checkbox = attachmentGrid.getElementById("dgsm_grid").rows[i + 1].cells[0].innerHTML;

                var valuePosition = checkbox.indexOf("value=");
                files += checkbox.substring(valuePosition + 7, valuePosition + 43) + ";";
                j++;
            }

        }
        if (files.length > 0) {
            files = files.substring(0, files.length - 1);
        }
        return files;
    }
    catch (error) {
        DGSM_HandleError(error.message);
    }
}

async function onChangeTaskInvoiceToBasware() {
    
    if (Xrm.Page.getAttribute("dgsm_taskid").getValue() != null) {
        var taskName = Xrm.Page.getAttribute("dgsm_taskid").getValue()[0].name.toLowerCase();
        if (taskName.startsWith("invoice to basware") || taskName.startsWith("invoice to scan")) {
            //llamada a función para selección de registro
            Xrm.Page.getControl("dgsm_invoicecompany").setVisible(true);
            Xrm.Page.getAttribute("dgsm_invoicecompany").setRequiredLevel("none");

            var queueid = Xrm.Page.getAttribute("dgsm_incomingqueueid").getValue()[0].id;
            var invoicecompany;
            var fetchXml = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>" +
                "<entity name='dgsm_invoicecompany'>" +
                "<attribute name='dgsm_invoicecompanyid' />" +
                "<attribute name='dgsm_name' />" +
                "<attribute name='createdon' />" +
                "<order attribute='dgsm_name' descending='false' />" +
                "<filter type='and'>" +
                "<condition attribute='dgsm_queue' operator='eq' uitype='queue' value='" + queueid + "' />" +
                "<condition attribute='statecode' operator='eq' value='0' />" +
                "</filter>" +
                "</entity>" +
                "</fetch>";
            var fetchXmlRequest = "?fetchXml=" + encodeURIComponent(fetchXml);
            await Xrm.WebApi.retrieveMultipleRecords("dgsm_invoicecompany", fetchXmlRequest).then(
                function success(result) {
                    if (result.entities.length == 1) {
                        invoicecompany = result.entities[0].dgsm_invoicecompanyid;
                        var lookupValue = new Array();
                        lookupValue[0] = new Object();
                        lookupValue[0].id = result.entities[0].dgsm_invoicecompanyid;
                        lookupValue[0].name = result.entities[0].dgsm_name;
                        lookupValue[0].entityType = "dgsm_invoicecompany"; //Entity Type of the lookup entity
                        if (Xrm.Page.getAttribute("dgsm_invoicecompany").getValue() === null) {
                            Xrm.Page.getAttribute("dgsm_invoicecompany").setValue(lookupValue);
                        }
                    }
                },
                function (error) {
                    alert(error.message);
                }
            );
        }
    }
}

async function DGSM_js_ribbon_Show_InvoicesIL(formContext) {
    //Enable rule for button "Get Invoices IL"
    //Button will be displayed if:
    // - Task activity: AR
    // - Task: Document Requests
    // - Incoming Queue: es_mbcarsvans@mercedes-benz.com, es_sc_mbcars@mercedes-benz.com, es_sc_mbvans@mercedes-benz.com 

    if (formContext.ui.getFormType() == 2 && //Update
        formContext.getAttribute("dgsm_taskid").getValue() != null &&
        formContext.getAttribute("dgsm_incomingqueueid").getValue() != null) {
        var queueName = formContext.getAttribute("dgsm_incomingqueueid").getValue()[0].name;
        var taskName = formContext.getAttribute("dgsm_taskid").getValue()[0].name


        if ((taskName == "Document Requests" || taskName == "Invoice Copy Request" || taskName == "Document Request_AS") &&
            (queueName == "es_mbcarsvans@mercedes-benz.com" || queueName == "es_sc_mbcars@mercedes-benz.com" || queueName == "es_sc_mbvans@mercedes-benz.com")) {

            //Retrieve the Task Activity Name
            var activityId = "";
            var activityName = "";
            var taskId = formContext.getAttribute("dgsm_taskid").getValue()[0].id;
            await parent.Xrm.WebApi.retrieveRecord("dgsm_casetask", taskId, "?$select=_dgsm_activityid_value").then(
                function successR(_task) {
                    activityId = _task._dgsm_activityid_value;
                },
                function (error) { }
            );
            await parent.Xrm.WebApi.retrieveRecord("dgsm_caseactivity", activityId, "?$select=dgsm_name").then(
                function successR(_activity) {
                    activityName = _activity.dgsm_name;
                },
                function (error) { }
            );

            if (activityName == "AR" || activityName == "AS" || (activityName == "SC" && taskName == "Invoice Copy Request")) {
                //Display the button
                return true;
            }
        }
    }

    return false;
}

async function DGSM_js_ribbon_OnClick_InvoicesIL(formContext) {
    // Fired on pressing the "Get Invoices IL" button
    //Call web service to get invoices data from IL Database for the current case.
    //The web service get the invoices according to the following Case fiels:
    // - dgsm_documentnumber -> Invoice document numbers separated by semicolon (;)
    // - dgsm_customervendorid -> Related customer or vendor code
    // - invoiceStartDate and invoiceEndDate -> Invoice date between these dates
    //The web service it creates note records related to the Case, with the retrieved invoices as attachment

    //Get case data
    var caseNumberId = formContext.data.entity.getId();
    caseNumberId = caseNumberId.replace("{", "").replace("}", "");
    var documentNumbers = formContext.getAttribute("dgsm_documentnumber").getValue();
    var invoiceStartDate = formContext.getAttribute("dgsm_startdate").getValue();
    var invoiceEndDate = formContext.getAttribute("dgsm_enddate").getValue();

    //Get customer vendor code
    var customerVendorCode = "";
    if (formContext.getAttribute("dgsm_accountid").getValue() != null) {
        var accountId = formContext.getAttribute("dgsm_accountid").getValue()[0].id;
        await parent.Xrm.WebApi.retrieveRecord("account", accountId, "?$select=dgsm_vendorcustomercode").then(
            function successR(_account) {
                customerVendorCode = _account.dgsm_vendorcustomercode;

                //Remove 0 - Only 9 digits
                if (customerVendorCode.length == 10) {
                    customerVendorCode = customerVendorCode.substring(1, 10);
                }
            },
            function (error) { }
        );
    }

    //Check parameters used to find invoices
    if (customerVendorCode == null || customerVendorCode == "") {
        var alertStrings = {
            confirmButtonLabel: "Ok", text: "An 'Account' with 'Customer/Vendor ID' is required", title: "Alert"
        };
        var alertOptions = { height: 120, width: 260 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        return;
    }

    if ((documentNumbers == null || documentNumbers == "")
        && ((invoiceStartDate == null || invoiceStartDate == "") || (invoiceEndDate == null || invoiceEndDate == ""))) {

        var alertStrings = {
            confirmButtonLabel: "Ok", text: "The following fields are required: 'Document numbers' (separated by semicolon) " +
                "and/or 'Start Date' and 'End Date'", title: "Alert"
        };
        var alertOptions = { height: 120, width: 260 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        return;
    }

    if (documentNumbers != null && documentNumbers != "") {
        documentNumbers = documentNumbers.trim();
    }

    if (invoiceStartDate != null && invoiceStartDate != "") {
        invoiceStartDate = formatDate(invoiceStartDate);
    }

    if (invoiceEndDate != null && invoiceEndDate != "") {
        invoiceEndDate = formatDate(invoiceEndDate);
    }

    //Show loading screen
    Xrm.Utility.showProgressIndicator("Retrieving invoices from IL database. Please wait...");

    //Call WebService to retrieve invoices from IL database
    //var integrationILWebService = "https://localhost:44341/integrationIL.asmx?op=GetInvoiceFromIL"; //Testing
    var integrationILWebService = "https://s638a006.esalc.corpintra.net:444/integrationIL.asmx?op=GetInvoiceFromIL";

    var dataSoap = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
        "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
        "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " +
        "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
        "<soap:Body>" +
        "<GetInvoiceFromIL xmlns=\"DGSM_IntegrationIL\">" +
        "<caseNumberId>" + caseNumberId + "</caseNumberId>" +
        "<customerVendorCode>" + customerVendorCode + "</customerVendorCode>" +
        "<invoiceNumbers>" + documentNumbers + "</invoiceNumbers>" +
        "<invoiceStartDate>" + invoiceStartDate + "</invoiceStartDate>" +
        "<invoiceEndDate>" + invoiceEndDate + "</invoiceEndDate>" +
        "</GetInvoiceFromIL>" +
        "</soap:Body>" +
        "</soap:Envelope>";
    if (typeof ($) === 'undefined') {
        $ = parent.$;
        jQuery = parent.jQuery;
    }

    $.ajax({
        url: integrationILWebService,
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        data: dataSoap,
        error: function (error) {
            //Close loading screen
            Xrm.Utility.closeProgressIndicator();

            //Process with errors
            var alertStrings = { confirmButtonLabel: "Ok", text: "There was a problem calling the IL web service", title: "Alert" };
            var alertOptions = { height: 120, width: 260 };
            Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
        },
        success: function (response) {
            //Get data from response
            var responseSuccess = $(response).find("operationsuccess").text(); //true is success
            var responseDetails = $(response).find("operationdetails").text();
            var notesnumber = $(response).find("notesnumber").text(); //Number of created notes

            //Close loading screen
            Xrm.Utility.closeProgressIndicator();

            if (responseSuccess.toLowerCase() == "true") {
                //Process executed OK
                var alertStrings = {
                    confirmButtonLabel: "OK", text: "Number of retrieved invoices: " + notesnumber, title: "Alert"
                };
                var alertOptions = { height: 120, width: 260 };
                Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
                    function (success) {
                        //Reload form
                        var entityFormOptions = {};
                        entityFormOptions["entityName"] = "incident";
                        entityFormOptions["entityId"] = caseNumberId;
                        Xrm.Navigation.openForm(entityFormOptions);
                    },
                    function (error) { }
                );
            }
            else {
                //Process with errors
                var alertStrings = { confirmButtonLabel: "Ok", text: "IL process error: " + responseDetails, title: "Alert" };
                var alertOptions = { height: 120, width: 260 };
                Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
            }
        },
        timeout: 120000 //Timeout to 120 seconds
    });
}

function formatDate(date) {
    //return date in format YYYYMMDD
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    if (month.toString().length < 2) {
        month = '0' + month;
    }
    if (day.toString().length < 2) {
        day = '0' + day;
    }

    var formatDate = year + "" + month + "" + day;

    return formatDate;
}

async function DGSM_pms_request(executionContext) {
    //Set "dgsm_pmsrequest" to fire plugin for PMS and get PMS invoices
    // information when case task is changed to "Invoice Status"

    var formContext = executionContext.getFormContext();

    //Only applies in active form
    if (formContext.ui.getFormType() != 1 && formContext.ui.getFormType() != 2) return;

    //Get task
    var task = formContext.getAttribute("dgsm_taskid").getValue();
    if (task == null) return;

    //Task is "Invoice Status"
    if (task[0].name.toLowerCase().startsWith("invoice status")) {

        //Check if account has "Customer/Vendor Code"
        var customerVendorCode = "";
        if (formContext.getAttribute("dgsm_accountid").getValue() != null) {
            var accountId = formContext.getAttribute("dgsm_accountid").getValue()[0].id;
            await parent.Xrm.WebApi.retrieveRecord("account", accountId, "?$select=dgsm_vendorcustomercode").then(
                function successR(_account) {
                    customerVendorCode = _account.dgsm_vendorcustomercode;
                },
                function (error) { }
            );
        }
        if (customerVendorCode == null || customerVendorCode == "") return;

        //Set value in dgsm_pmsrequest to fire PMS plugin
        if(formContext.getAttribute("dgsm_pmsrequest").getValue() == ""){
            formContext.getAttribute("dgsm_pmsrequest").setValue(Date.now().toString());
            formContext.data.entity.save();
        }
        else{
            formContext.getAttribute("dgsm_pmsrequest").setValue(Date.now().toString());
        }
    }
}

function DGSM_clearIdentifyFields(formContext) {
    if (formContext.getAttribute("createdon").getValue() >= new Date(2023, 02, 13)) {
        DGSM_DeleteValue(formContext, "dgsm_documentnumber");
        DGSM_DeleteValue(formContext, "dgsm_amount");
        DGSM_DeleteValue(formContext, "dgsm_startdate");
        DGSM_DeleteValue(formContext, "dgsm_enddate");
        DGSM_DeleteValue(formContext, "dgsm_months");
        DGSM_DeleteValue(formContext, "dgsm_comments");
        DGSM_DeleteValue(formContext, "dgsm_vendorcode");
        DGSM_DeleteValue(formContext, "dgsm_vinnumber");
        DGSM_DeleteValue(formContext, "dgsm_platenumber");
        DGSM_DeleteValue(formContext, "dgsm_multiplequeries");
        DGSM_DeleteValue(formContext, "dgsm_mileage");
        DGSM_DeleteValue(formContext, "dgsm_casebu");
        DGSM_DeleteValue(formContext, "dgsm_chasis");
        DGSM_DeleteValue(formContext, "dgsm_dunningletter");
        DGSM_DeleteValue(formContext, "dgsm_dunninglevel");
        DGSM_DeleteValue(formContext, "dgsm_requester");
        DGSM_DeleteValue(formContext, "dgsm_invoicecompany");
    }
}

function DGSM_ribbon_OnClick_Resolve(formContext) {
    // Fired on pressing the "Resolve Case" button in the form ribbon.
    // Call a workflow to resolve the incident

    var entityId = formContext.data.entity.getId();
    var workflowId = "6d92744e-884b-41a9-8a5d-c9ca8c9873ba"; //Workflow: DGSM_CaseResolve
    var queryWF = "workflows(" + workflowId + ")/Microsoft.Dynamics.CRM.ExecuteWorkflow";
    var data = { "EntityId": entityId };
    var openChild = false;
    var caseId = entityId.replace("{", "").replace("}", "");

    //Check if there is an open child case
    var req = new XMLHttpRequest();
    req.open("GET", Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/incidents?$select=_dgsm_activityid_value&$filter=(_parentcaseid_value eq " + caseId + " and statecode eq 0)", false);
    req.setRequestHeader("OData-MaxVersion", "4.0");
    req.setRequestHeader("OData-Version", "4.0");
    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    req.setRequestHeader("Accept", "application/json");
    req.setRequestHeader("Prefer", "odata.include-annotations=*");
    req.onreadystatechange = function () {
        if (this.readyState === 4) {
            req.onreadystatechange = null;
            if (this.status === 200) {
                var results = JSON.parse(this.response);
                if (results.value.length >= 1) {
                    openChild = true;
                    //alert("Cannot close case because there are opened child cases");
                }
            } else {
                console.log(this.responseText);
            }
        }
    };
    req.send();
    if (openChild) {
        alert("Cannot close case because there are opened child cases");
        return;
    }
    //Save the form and call the DGSM_CaseResolve workflow
    Xrm.Utility.closeProgressIndicator("");
    formContext.data.save().then(
        function () {
            //Create a request
            var req = new XMLHttpRequest();
            req.open("POST", Xrm.Page.context.getClientUrl() + "/api/data/v9.0/" + queryWF, false);
            req.setRequestHeader("Accept", "application/json");
            req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            req.setRequestHeader("OData-MaxVersion", "4.0");
            req.setRequestHeader("OData-Version", "4.0");
            req.onreadystatechange = function () {
                if (this.readyState == 4) {
                    req.onreadystatechange = null;
                    if (this.status == 200 || this.status == 204) {

                        Xrm.Utility.closeProgressIndicator();
                        //Reload form
                        var entityFormOptions = {};
                        entityFormOptions["entityName"] = "incident";
                        entityFormOptions["entityId"] = entityId;
                        Xrm.Navigation.openForm(entityFormOptions);
                    }
                }
            };
            req.send(JSON.stringify(data));
        }, null);
}

async function DGSM_Communication_Cases(executionContext) {

    // function to provide communication between parents and child cases

    var formContext = executionContext.getFormContext();
    var globalContext = Xrm.Utility.getGlobalContext();
    var parentCase = formContext.getAttribute("parentcaseid").getValue();
    var currentUserName = globalContext.userSettings.userName;
    var currentCaseRecord = formContext.data.entity.getId().replace("{", "").replace("}", "");
    var chatCode = formContext.getAttribute("dgsm_chat_case").getValue();
    var newCommunication = formContext.getAttribute("dgsm_communicationnewmessage").getValue();
    const dateNow = new Date();
    var nameChat = dateNow.toISOString().replace(/(\.\d{3})|[^\d]/g, '');
    var chatRecord;
    var chatContent;
    var associatedRecordsArray = new Array();
    var isParent;
    // cleanup of message field
    formContext.getAttribute("dgsm_communicationnewmessage").setValue(null);

    // test if case record has new message field
    if (newCommunication != null) {
        // test if is parent case or not
        if (parentCase == null) {
            var caseNumber = "Parent";
            isParent = true;

            // raise a flag to all children records

            await raiseFlagToChildren(currentCaseRecord);

        }
        else {
            var caseNumber = formContext.getAttribute("ticketnumber").getValue();
            isParent = false;

            // raise a flag to the parent record case

            var newFlag = {};
            newFlag['dgsm_newmessageincoming'] = true;
            await Xrm.WebApi.updateRecord("incident", parentCase[0].id.replace("{", "").replace("}", ""), newFlag).then(
                function success(result) {
                },
                function (error) {
                    console.log(error.message)
                }
            );
        }
        // build new line of message plus previous content
        var newContent = "[ " + currentUserName + " " + dateNow.toLocaleString("es-ES") + " " + caseNumber + " ] : " + newCommunication + "\n";
        if (chatCode == null) {

            var newChatData = {
                "dgsm_chatcode": nameChat,
                "dgsm_chat_content": newContent
            }
            // create chat record
            await Xrm.WebApi.createRecord("dgsm_chat_case", newChatData).then(
                function success(result) {
                    chatRecord = result.id;
                },
                function (error) {
                    console.log(error.message)
                }
            );

            // update incident record with new chat record
            var record = {};
            record["dgsm_Chat_case@odata.bind"] = "/dgsm_chat_cases(" + chatRecord + ")";
            await Xrm.WebApi.updateRecord("incident", currentCaseRecord, record).then(
                function success(result) {
                    // console.log("update done");
                },
                function (error) {
                    console.log(error.message);
                }
            );
            // search for associated cases

            if (isParent) {
                // if is parent case
                associatedRecordsArray = await searchChildrenCases(currentCaseRecord, associatedRecordsArray);
            }
            else {
                // if is a child case
                var parentId = parentCase[0].id.replace("{", "").replace("}", "");
                
                await Xrm.WebApi.retrieveMultipleRecords("incident", "?$select=incidentid&$filter=(_parentcaseid_value eq " + parentId + " or incidentid eq " + parentId + ")").then(
                    function success(resultsCh) {
                        for (var s = 0; s < resultsCh.entities.length; s++) {
                            var resultCh = resultsCh.entities[s];
                            associatedRecordsArray.push(resultCh["incidentid"]);
                        }
                    },
                    function (error) {
                        console.log(error.message);
                    }
                );
            }

            // associate case with chat record
            await linkIncidentRecords(chatRecord, associatedRecordsArray);

        }
        else {

            // in case the chatRecord exists, get chat content
            chatCode = chatCode[0].id.replace("{", "").replace("}", "");
            await Xrm.WebApi.retrieveRecord("dgsm_chat_case", chatCode, "?$select=dgsm_chat_content").then(
                function success(result) {
                    chatContent = result["dgsm_chat_content"];
                },
                function (error) {
                    console.log(error.message);
                }
            );
            // add new line at top of chat
            var recordChat = {};
            recordChat.dgsm_chat_content = newContent + chatContent;
            await Xrm.WebApi.updateRecord("dgsm_chat_case", chatCode, recordChat).then(
                function success(result) {
                    //                    var updatedId = result.id;
                    //                    console.log(updatedId);
                },
                function (error) {
                    console.log(error.message);
                }
            );

            // check if there are new child cases and insert into chat   
            if (isParent) {
                associatedRecordsArray = await searchChildrenCases(currentCaseRecord, associatedRecordsArray);
                await linkIncidentRecords(chatCode, associatedRecordsArray);


            }
        }
    }
}


async function searchChildrenCases(parentRecord, associatedArray) {

    await Xrm.WebApi.retrieveMultipleRecords("incident", "?$select=incidentid&$filter=_parentcaseid_value eq " + parentRecord).then(
        function success(results) {
            for (var i = 0; i < results.entities.length; i++) {
                var result = results.entities[i];
                associatedArray.push(result["incidentid"]);
            }
        },
        function (error) {
            console.log(error.message);
        }
    );

    return associatedArray
}

async function linkIncidentRecords(chatRecord, asocArrayRec) {

    var linkRecord = {};
    linkRecord["dgsm_Chat_case@odata.bind"] = "/dgsm_chat_cases(" + chatRecord + ")";
    for (var a = 0; a < asocArrayRec.length; a++) {

        await Xrm.WebApi.updateRecord("incident", asocArrayRec[a], linkRecord).then(
            function success(result) {
                // console.log("update of associated cases done");
            },
            function (error) {
                console.log(error.message);
            }
        );
    }
}

async function raiseFlagToChildren(parentId) {

    var childrenArray = new Array();
    childrenArray = await searchChildrenCases(parentId, childrenArray);
    for (var e = 0; e < childrenArray.length; e++) {
        var recordChild = {};
        recordChild.dgsm_newmessageincoming = true;
        await Xrm.WebApi.updateRecord("incident", childrenArray[e], recordChild).then(
            function success(result) {
                // console.log("raised a flag");
            },
            function (error) {
                console.log(error.message);
            }
        );
    }
}

async function DGSM_onLoad_Chat(executionContext) {

    var formContext = executionContext.getFormContext();
    var currentCaseId = formContext.data.entity.getId().replace("{", "").replace("}", "");
    var parent = formContext.getAttribute("parentcaseid").getValue();
    var status = formContext.getAttribute("statuscode").getValue();
    var chatRecord = formContext.getAttribute("dgsm_chat_case").getValue();
    var numberofChildCases = formContext.getAttribute("numberofchildincidents").getValue();
    var newMessage = formContext.getAttribute("dgsm_newmessageincoming").getValue();
    var chatActive;


    // check if is parent and has new messages from chidren

    if (parent == null && newMessage == true) {
        alert("new message from children case");
        formContext.getAttribute("dgsm_newmessageincoming").setValue(false);
    }

    // check if children has new message from parent

    if (parent != null && newMessage == true) {
        alert("new message from parent case");
        formContext.getAttribute("dgsm_newmessageincoming").setValue(false);
    }

    // hide message field if parent don't have children cases

    if (numberofChildCases == null && parent == null) {
        formContext.getControl("dgsm_communicationnewmessage").setVisible(false);
    }

    // check if is chidren and is a new record
    if (parent != null) {
        var parentRecord = parent[0].id.replace("{", "").replace("}", "");

        if (chatRecord == null) {
            // check if the parent has chat active
            await Xrm.WebApi.retrieveRecord("incident", parentRecord, "?$select=_dgsm_chat_case_value").then(
                function success(result) {
                    chatActive = result["_dgsm_chat_case_value"];
                    //console.log("has parent with chat record")
                    //console.log(chatActive);
                },
                function (error) {
                    console.log(error.message);
                }
            );
        }
        if (chatActive != null) {
            // if parent has a chat record join chidren to the chat
            var chatId = {};
            chatId["dgsm_Chat_case@odata.bind"] = "/dgsm_chat_cases(" + chatActive + ")";
            await Xrm.WebApi.updateRecord("incident", currentCaseId, chatId).then(
                function success(result) {
                    //console.log("join new children to chat done");
                },
                function (error) {
                    console.log(error.message);
                }
            );
        }
    }

}

function DGSM_messageVisibility(executionContext) {

    //set visibility of new message field when a chidren case is created into the parent
    var formContext = executionContext.getFormContext();
    var gridChildCases = formContext.getControl("dgsm_grid_childcases");
    var chatCase = formContext.getAttribute("dgsm_chat_case").getValue();
    var parent = formContext.getAttribute("parentcaseid").getValue();
    var updatedGrid = false;
    var updateGridChildren = function () {
        var totalChildren = gridChildCases.getGrid().getTotalRecordCount();
        if (totalChildren > 0 && updatedGrid == false) {
            // console.log("there is children inside the grid");
            formContext.getControl("dgsm_communicationnewmessage").setVisible(true);
            formContext.data.refresh(false).then(
                function success(result) {
                    console.log('data refreshed');
                    updatedGrid = true;
                },
                function (error) {
                    console.log(error.message)
                }
            );
        }
    };
    if (chatCase == null) {
        gridChildCases.addOnLoad(updateGridChildren);
    }

    if (parent != null) {
        formContext.getControl("dgsm_grid_childcases").setVisible(false);
    }

}

function DGSM_filterWorkedBy(executionContext) {

    var formContext = executionContext.getFormContext();
    var team = formContext.getAttribute("ownerid").getValue()[0].id;
    var teamClean = team.replace("{", "").replace("}", "");
    // we make a custom view to filter afterwards
    var entityName = "systemuser";
    var viewId = "00000000-0000-0000-0000-000000000001";
    var viewDisplayName = "Team Members";
    var fetchXml = [
        "<fetch>",
        "  <entity name='systemuser'>",
        "    <attribute name='internalemailaddress'/>",
        "    <link-entity name='teammembership' from='systemuserid' to='systemuserid' alias='a'>",
        "      <attribute name='teamid'/>",
        "      <filter>",
        "        <condition attribute='teamid' operator='eq' value='", teamClean, "'/>",
        "      </filter>",
        "    </link-entity>",
        "  </entity>",
        "</fetch>"
    ].join("");

    var layoutXml = [
        "<grid name='resultset' object='1' jump='systemuserid' select='1' icon='1' preview='1'>",
        "<row name='result' id='systemuserid'>" +
        "<cell name='fullname' width='150' />" +
        "<cell name='internalemailaddress' width='150' />" +
        "</row>" +
        "</grid>"
    ].join("");

    formContext.getControl("dgsm_workedbyid").addCustomView(viewId, entityName, viewDisplayName, fetchXml, layoutXml, true);

}

function DGSM_onChange_customerVendorid(executionContext) {

    var formContext = executionContext.getFormContext();
    var vendorIdValue = formContext.getAttribute("dgsm_customervendorid").getValue();
    if (vendorIdValue != null) {
        var rexp = /^[0-9]*$/;
        if (!rexp.test(vendorIdValue)) {
            formContext.getControl("dgsm_customervendorid").setNotification("Vendor/Customer ID must be Numerics. Please Enter Numerics .");
            formContext.getAttribute("dgsm_customervendorid").setValue(null);
            var control = Xrm.Page.ui.controls.get("dgsm_customervendorid");
            formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(true);
            control.setFocus();
            return;
        }
        else {
            formContext.getControl("dgsm_customervendorid").clearNotification();
            formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(false);
        }
        if (vendorIdValue.length < 10) {
            formContext.getControl("dgsm_customervendorid").setNotification("Vendor/Customer ID must have 10 digits");
            var control = Xrm.Page.ui.controls.get("dgsm_customervendorid");
            formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(true);
            control.setFocus();
        }
        else {
            formContext.getControl("dgsm_customervendorid").clearNotification();
            formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(false);
        }
    }
    else {
        formContext.getControl("dgsm_customervendorid").clearNotification();
        formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(false);
    }
}


function DGSM_onChange_accountidQuickForm(executionContext) {
    DGSM_addRemovePrimaryContactFilter(executionContext)
}
function DGSM_addRemovePrimaryContactFilter(executionContext) {
    var formContext = executionContext.getFormContext();
    if (formContext.getAttribute("dgsm_accountid").getValue() != null) {
        var account = formContext.getAttribute("dgsm_accountid").getValue()[0].name;
        var accountId = formContext.getAttribute("dgsm_accountid").getValue()[0].id;
        account = account.toLowerCase();
        if (account.indexOf("dummy") == -1) {
            var fetchXMLcontact = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
                "<entity name='contact'>" +
                "<attribute name='emailaddress1' />" +
                "<attribute name='fullname' />" +
                "<attribute name='telephone1' />" +
                "<attribute name='contactid' />" +
                "<order attribute='fullname' descending='false' />" +
                "<link-entity name='dgsm_account_contact' from='contactid' to='contactid' visible='false' intersect='true'>" +
                "<link-entity name='account' from='accountid' to='accountid' alias='ad'>" +
                "<filter type='and'>" +
                "<condition attribute='accountid' operator='eq' uitype='account' value=' " + accountId + "'/>" +
                "</filter>" +
                "</link-entity>" +
                "</link-entity>" +
                "</entity>" +
                "</fetch>";
            var viewName = "Related Contacts";
            var layoutXML = "<grid name='contacts' object='2' jump='fullname' select='1' icon='1' preview='0'>" +
                "  <row name='contact' id='contactid'>" +
                "    <cell name='emailaddress1' width='300' />" +
                "    <cell name='fullname' width='100' />" +
                "  </row>" +
                "</grid>";
            var viewId = formContext.getControl("primarycontactid").getDefaultView();
            formContext.getControl("primarycontactid").addCustomView(viewId, "contact", viewName, fetchXMLcontact, layoutXML, true);
            return;
        }
        var fetchXMLcontact = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
            "<entity name='contact'>" +
            "<attribute name='emailaddress1' />" +
            "<attribute name='fullname' />" +
            "<attribute name='telephone1' />" +
            "<attribute name='contactid' />" +
            "<order attribute='fullname' descending='false' />" +
            "</entity>" +
            "</fetch>";
        var viewName = "All Contacts";
        var layoutXML = "<grid name='contacts' object='2' jump='fullname' select='1' icon='1' preview='0'>" +
            "  <row name='contact' id='contactid'>" +
            "    <cell name='emailaddress1' width='300' />" +
            "    <cell name='fullname' width='100' />" +
            "  </row>" +
            "</grid>";
        var viewId = formContext.getControl("primarycontactid").getDefaultView();
        formContext.getControl("primarycontactid").addCustomView(viewId, "contact", viewName, fetchXMLcontact, layoutXML, true);

    }
}

function DGSM_MdExecutionTask(executionContext) {
    // fired on load form
    // when have data and save make readonly fields vendorid, amend/confirm and amend comments
    var formContext = executionContext.getFormContext();
    var customerVendorId = formContext.getAttribute("dgsm_customervendorid").getValue();
    var vendorDetails = formContext.getAttribute("dgsm_vendordetailsconfirmamend").getValue();
    if (customerVendorId != null && vendorDetails != null) {
        formContext.getControl("dgsm_customervendorid").setDisabled(true);
        formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(true);
        formContext.getControl("dgsm_vendordetailscomments").setDisabled(true);
    }
}

function dgsm_vendorDetails(executionContext) {

    //invoked on change of buttons confirm/amend

    var formContext = executionContext.getFormContext();
    var optionSelected = formContext.getAttribute("dgsm_vendordetailsconfirmamend").getValue();
    var customerVendor = formContext.getAttribute("dgsm_customervendorid").getValue();
    if (optionSelected != null) {
        if (optionSelected == 697250000) {
            formContext.getAttribute("dgsm_customervendorid").setRequiredLevel("required");
        }
        else {
            formContext.getAttribute("dgsm_customervendorid").setRequiredLevel("none");
        }
    }
    else {
        formContext.getAttribute("dgsm_customervendorid").setRequiredLevel("none");
    }
}

function DGSM_VendorDetailsOnSave(executionContext) {
    // invoked on save to block edit fields after validation
    var formContext = executionContext.getFormContext();
    var vendorId = formContext.getAttribute("dgsm_customervendorid").getValue();
    var optionDetail = formContext.getAttribute("dgsm_vendordetailsconfirmamend").getValue();
    if (vendorId != null && optionDetail != null) {
        formContext.getControl("dgsm_customervendorid").setDisabled(true);
        formContext.getControl("dgsm_vendordetailsconfirmamend").setDisabled(true);
        formContext.getControl("dgsm_vendordetailscomments").setDisabled(true);
    }
}
function DGSM_ContracTermination_OnChange(executionContext) {
    var formContext = executionContext.getFormContext();
    if (formContext.getAttribute("dgsm_terminationreason").getValue() == 697250008) {
        DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", true, true);

    } else {
        DGSM_ConfigField(executionContext, "dgsm_commentsterminationreason", false, false);
        formContext.getAttribute("dgsm_commentsterminationreason").setValue(null);
    }
}

function DGSM_OnChange_incomingQueue_ChildCase(executionContext) {
    var formContext = executionContext.getFormContext();
    if (formContext.getAttribute("parentcaseid").getValue() != null) {
        if (formContext.getAttribute("dgsm_taskid").getValue() != null) {
            formContext.getAttribute("dgsm_taskid").setValue(null);
        }
    }

}

function DGSM_Set_Contact_Type_Value(executionContext) {
    var formContext = executionContext.getFormContext();
    var contactCase = formContext.getAttribute("primarycontactid").getValue();
    if (contactCase != null) {
        var contactId = contactCase[0].id.replace("{", "").replace("}", "");
        var req = new XMLHttpRequest();
        req.open("GET", Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.2/contacts(" + contactId + ")?$select=emailaddress1", false);
        req.setRequestHeader("OData-MaxVersion", "4.0");
        req.setRequestHeader("OData-Version", "4.0");
        req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("Prefer", "odata.include-annotations=*");
        req.onreadystatechange = function () {
            if (this.readyState === 4) {
                req.onreadystatechange = null;
                if (this.status === 200) {
                    var result = JSON.parse(this.response);
                    console.log(result);
                    // Columns
                    var contactid = result["contactid"]; // Guid
                    var emailaddress1 = result["emailaddress1"]; // Text
                    emailaddress1 = emailaddress1.toLowerCase();
                    if (emailaddress1.indexOf("mercedes-benz.com") != -1) {
                        //Internal
                        formContext.getAttribute("dgsm_contacttype").setValue(697250000);
                    }
                    else {
                        formContext.getAttribute("dgsm_contacttype").setValue(697250001);
                    }
                    formContext.getAttribute("dgsm_contacttype").setSubmitMode("always");
                } else {
                    console.log(this.responseText);
                }
            }
        };
        req.send();

    }

}
function DGSM_validateDueDate(executionContext) {

    var formContext = executionContext.getFormContext();
    var dueDate = formContext.getAttribute("dgsm_duedate").getValue();
    if (dueDate != null) {
        var dueDateFormat = formatDate(dueDate);
        var tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        var tomorrowDateFormat = formatDate(tomorrowDate);
        if (dueDateFormat < tomorrowDateFormat) {
            formContext.getControl("dgsm_duedate").setNotification("Current and past dates are not valid.", "101");
        }
        else {
            formContext.getControl("dgsm_duedate").clearNotification("101");
        }
    }
    else {
        formContext.getControl("dgsm_duedate").clearNotification("101");
    }

}
function DGSM_SubtaksFSGL(executionContext) { 
    var formContext = executionContext.getFormContext();
    if (formContext.getAttribute("dgsm_taskid").getValue() == null) return;
    var taskid = formContext.getAttribute("dgsm_taskid").getValue()[0];
    if (formContext.getAttribute("dgsm_taskid").getValue() != null) {
        var normalizedTaskId = taskid.name.toLowerCase();
        if (normalizedTaskId == "financial gl accounting es fs" && formContext.getAttribute("dgsm_casesubtaskid").getValue() != null) {
            formContext.getAttribute("dgsm_accountid").setRequiredLevel("none");
            formContext.getAttribute("customerid").setRequiredLevel("none");
            formContext.getAttribute("statuscode").setValue(1);
        } else if (normalizedTaskId == "financial gl accounting es fs") {
            formContext.getAttribute("statuscode").setValue(697250000);
        }
    }
}