function blackoutDateStatus(cal, date, oid, projectOid) {
	var blackoutDates = cal.blackoutDates;
	if (blackoutDates) {
		var year = date.getFullYear(), month = date.getMonth(), day = date
				.getDate(), blackoutDateCount = blackoutDates.length, blackoutDate, blackoutType;
		for (var i = 0; i < blackoutDateCount; i++) {
			blackoutDate = blackoutDates[i];
			if (year == blackoutDate.year && month == blackoutDate.month
					&& day == blackoutDate.day) {
				blackoutType = blackoutDate.type;
				if (blackoutType == 'Left') {
					return 'blackout-left';
				} else if (blackoutType == 'Right') {
					return 'blackout-right';
				} else {
					return 'blackout';
				}
			}
		}
	} else if (!cal.gettingBlackoutDates) {
		cal.gettingBlackoutDates = true;
		getBlackoutDates(cal, oid, projectOid);
	}
	return false;
}
function getBlackoutDates(cal, oid, projectOid) {
	var currentDate = cal.date;
	var startDate = new Date(currentDate.getFullYear(),
			currentDate.getMonth() + 1, 1);
	var endDate = new Date(currentDate.getFullYear(),
			currentDate.getMonth() + 2, 0);
	var startDateString = startDate.getFullYear() + "-" + startDate.getMonth()
			+ "-" + startDate.getDate();
	var endDateString = endDate.getFullYear() + "-" + endDate.getMonth() + "-"
			+ endDate.getDate();
	var url = getContextPath() + "/it/blackout.sp";
	var params = [];
	params.push(new HttpParam('startDate', startDateString));
	params.push(new HttpParam('endDate', endDateString));
	params.push(new HttpParam('excludedIterationOid', oid));
	params.push(new HttpParam('projectOid', projectOid));
	sendRequest(url, params, true, function(xmlhttp) {
		parseBlackoutDates(xmlhttp, cal)
	}, 'GET', false);
}
function parseBlackoutDates(xmlhttp, cal) {
	cal.blackoutDates = Ext4.JSON.decode(xmlhttp.responseText);
	cal.refresh();
	cal.blackoutDates = null;
	cal.gettingBlackoutDates = false;
}
function chooseParent(childOid) {
	hideSelects();
	window.choose = function() {
		var parentOid = getCheckedItemValues();
		if (parentOid) {
			document.getElementById('parentDisplayString').innerHTML = chosenDisplayString;
			document.getElementById('clearParent').style.display = 'inline';
		}
		unhideSelects();
		removeTpsReport('chooseportfolioitem');
		var form = window.document['itemForm'];
		form['parent'].value = parentOid;
		markAsChanged(form['parent']);
	};
	var prms = new Array(new HttpParam('search', ''));
	prms.push(new HttpParam('oid', childOid));
	extractSelectValueAndAppendParameter(prms, 'project', 'cpoid');
	extractSelectValueAndAppendParameter(prms, 'project');
	extractSelectValueAndAppendParameter(prms, 'typeDef');
	showPopup(getContextPath() + '/pi/choose.sp', prms, 675, 480);
}
function extractSelectValueAndAppendParameter(prms, elementName, paramName) {
	var select = getEditorFormElement(elementName);
	if (select) {
		paramName = paramName || elementName + 'Oid';
		prms.push(new HttpParam(paramName, select.value));
	}
}
function clearParent() {
	var form = window.document['itemForm'];
	form['parent'].value = '';
	markAsChanged(form['parent']);
	document.getElementById('parentDisplayString').innerHTML = '';
	document.getElementById('clearParent').style.display = 'none';
}
window.forceFormChanged = false;
window.potentialChanges = {};
window.nextId = 1;
function execute(type, action, isEditing) {
	var info = RALLY.util.getTypeInfoByType(type);
	console.log("INFO: " + info);
	if (!submitted) {
		var form = window.document['itemForm'];
		form.action = getActionUrl(info.prefix, action);
		if (!didFormChange() && isEditing) {
			if (action == 'updateAndClose') {
				window.close();
			} else if (action == 'updateAndNew') {
				if (typeof updateCreationContext == "function") {
					updateCreationContext();
				}
				form.action = getContextPath() + '/' + info.editor.newPath;
				submitForm(form);
			}
		} else {
			if (action != 'update' && action != 'create'
					&& typeof markAsChangedForSubmit == 'function') {
				markAsChangedForSubmit();
			}
			disableButtons();
			if (typeof updateCreationContext == "function") {
				updateCreationContext();
			}
			submitForm(form);
			if (action == 'createAndNew' || action == 'updateAndNew'
					|| action == 'updateAndClose' || action == 'createAndClose') {
				eraseCookie(EDITOR_COOKIE_KEY);
			}
		}
	}
}
function getActionUrl(type, action) {
	return getContextPath() + '/' + type + '/edit/' + action + '.sp';
}
function isNormalSelect(elem) {
	return elem.size <= 1;
}
function valueGetterForSelects(elem) {
	if (isNormalSelect(elem)) {
		return elem.selectedIndex;
	}
	var values = [];
	for (var i = 0; i < elem.options.length; i++) {
		values.push(elem.options[i].text);
	}
	return values.join();
}
function valueGetterForInputs(elem) {
	if (elem.type == 'radio' || elem.type == 'checkbox') {
		return elem.checked;
	}
	return elem.value;
}
function markElementForTracking(elem, valueGetter) {
	if (!elem.id) {
		elem.id = '_random_id_' + nextId;
		++nextId;
	}
	elem._valueGetter = valueGetter;
	elem._initialValue = valueGetter(elem);
}
function _flagPotentialChange(e) {
	if (e) {
		window.potentialChanges[e.id] = e._initialValue !== e._valueGetter(e);
	}
}
function closeWindow() {
	window.close();
}
function didFormChange() {
	if (window.forceFormChanged || scanForChanges()) {
		return true;
	}
	return YAHOO.util.Dom.getElementsByClassName("ed-err-tbl").length > 0;
}
function markAsChanged(e) {
	if (e && e.tagName && e.type != 'file' && e._valueGetter) {
		_flagPotentialChange(e);
		if (e.type == 'radio') {
			var otherElem = null;
			if (e.id.indexOf('true') != -1) {
				otherElem = document.getElementById(e.id.replace('true',
						'false'));
			} else if (e.id.indexOf('false') != -1) {
				otherElem = document.getElementById(e.id.replace('false',
						'true'));
			}
			_flagPotentialChange(otherElem);
		}
	} else {
		window.forceFormChanged = true;
	}
}
function monitorChangesFor(elements, valueGetter, addChangeListenerCondition) {
	valueGetter = valueGetter || valueGetterForInputs;
	addChangeListenerCondition = addChangeListenerCondition || function() {
		return true;
	};
	var handler = function() {
		markAsChanged(this);
	};
	for (var i = 0; i < elements.length; i++) {
		markElementForTracking(elements[i], valueGetter);
		if (addChangeListenerCondition(elements[i])) {
			YAHOO.util.Event.addListener(elements[i], 'change', handler);
			if (elements[i].type == 'text' || elements[i].type == 'password') {
				YAHOO.util.Event.addListener(elements[i], 'keyup', handler);
			}
		}
	}
}
function attachChangeMonitorToSection(elem) {
	monitorChangesFor(elem.getElementsByTagName('INPUT'));
	monitorChangesFor(elem.getElementsByTagName('SELECT'),
			valueGetterForSelects, isNormalSelect);
	monitorChangesFor(elem.getElementsByTagName('TEXTAREA'));
}
function initFormChangedValue() {
	var dirty = readCookie(EDITOR_COOKIE_KEY);
	eraseCookie(EDITOR_COOKIE_KEY);
	if (dirty && dirty === 'yes') {
		window.forceFormChanged = true;
		window.potentialChanges = {};
	}
}
function attachChangeMonitor() {
	initFormChangedValue();
	attachChangeMonitorToSection(document);
}
function scanForChanges() {
	for ( var key in potentialChanges) {
		if (potentialChanges[key]) {
			return true;
		}
	}
	return false;
}
var EDITOR_COOKIE_KEY = "RALLY-Editor-isDirty";
function markAsChangedForSubmit() {
	createCookie(EDITOR_COOKIE_KEY, "yes");
}
function toggleSection(index, numberOfRows) {
	var agt = navigator.userAgent.toLowerCase();
	var is_ie = ((agt.indexOf("msie") != -1));
	for (var i = 0; i < numberOfRows; i++) {
		var row = document.getElementById(index + "_" + i);
		var img = document.getElementById("i_" + index);
		if (row.style.display === null || row.style.display == ""
				|| row.style.display == "block"
				|| row.style.display == "table-row") {
			img.src = getContextPath() + "/images/icon_editor_plus.gif";
			row.style.display = "none";
		} else {
			img.src = getContextPath() + "/images/icon_editor_minus.gif";
			if (is_ie) {
				row.style.display = "block";
			} else {
				row.style.display = "table-row";
			}
		}
	}
}
function disableButtons() {
	var buttons = Ext.query('.ed-btns button');
	for ( var i in buttons) {
		if (buttons.hasOwnProperty(i)) {
			buttons[i].disabled = true;
		}
	}
}
function enableButtons() {
	var buttons = Ext.query('.ed-btns button');
	for ( var i in buttons) {
		if (buttons.hasOwnProperty(i)) {
			buttons[i].disabled = false;
		}
	}
}
function executeAction(form, action, isEditing) {
	if (!didFormChange() && isEditing) {
		if (action == 'save') {
			window.close();
		}
	} else {
		disableButtons();
		setEventId(form, action);
		submitForm(form);
	}
}
function showEditorInvalidatedLightbox() {
	var html = '<p>We\'re sorry, your editor has been invalidated. Please close it and try again.</p>';
	var lightbox = new RALLY.ui.Lightbox({
		id : 'editor_invalidated_lightbox',
		title : 'We could not save your changes...',
		width : 400,
		closable : true,
		bodyStyle : {
			padding : '12px'
		},
		items : [ new RALLY.ui.TabPanel({
			html : html,
			buttonAlign : 'center',
			buttons : [ new RALLY.ui.Button({
				text : 'Ok',
				cls : 'primary small',
				handler : function() {
					lightbox.destroy();
				}
			}) ]
		}) ]
	});
	lightbox.show();
}
function getChangeAuthor(changeAuthor) {
	return (changeAuthor || 'Another user');
}
function doForceOverwrite(type, actionName) {
	var form = window.document.itemForm;
	var prefix = RALLY.util.getTypeInfoByType(type).prefix;
	if (actionName.indexOf('AndNew') > 0) {
		form.action = getActionUrl(prefix, 'forceOverwriteAndNew');
	} else if (actionName.indexOf('AndClose') > 0) {
		form.action = getActionUrl(prefix, 'forceOverwriteAndClose');
	} else {
		form.action = getActionUrl(prefix, 'forceOverwriteAndEdit');
	}
	submitForm(form);
	if (actionName == 'updateAndNew' || actionName == 'updateAndClose'
			|| actionName == 'createAndClose') {
		eraseCookie(EDITOR_COOKIE_KEY);
	}
}
function showRecoverableConcurrencyLightbox(type, message, actionName) {
	window.forceFormChanged = true;
	var actionIsCreate = actionName == 'create' || actionName == 'createAndNew'
			|| actionName == 'createAndClose';
	var disableOverwrite = actionIsCreate && type == 'attribute' ? true : false;
	var html = '<p>' + message + '</p>';
	var lightbox = new RALLY.ui.Lightbox({
		id : 'editor_concurrency_lightbox',
		title : 'We could not save your changes...',
		width : 400,
		closable : true,
		bodyStyle : {
			padding : '12px'
		},
		items : [ new RALLY.ui.TabPanel({
			html : html,
			buttonAlign : 'center',
			buttons : [ new RALLY.ui.Button({
				id : 'concurrencyReview',
				text : 'Review my changes',
				cls : 'primary small',
				handler : function() {
					lightbox.destroy();
				}
			}), new RALLY.ui.Button({
				id : 'concurrencyOverwrite',
				text : 'Overwrite with my version',
				cls : 'primary small',
				disabled : disableOverwrite,
				handler : function() {
					lightbox.destroy();
					doForceOverwrite(type, actionName);
				}
			}) ]
		}) ]
	});
	lightbox.show();
}
function showUnrecoverableConcurrencyLightbox(message, reviewable) {
	window.forceFormChanged = true;
	var html = '<p>' + message + '</p>';
	var lightbox = new RALLY.ui.Lightbox({
		id : 'editor_concurrency_lightbox',
		title : 'We could not save your changes...',
		width : 400,
		closable : reviewable,
		bodyStyle : {
			padding : '12px'
		},
		items : [ new RALLY.ui.TabPanel({
			html : html,
			buttonAlign : 'center',
			buttons : [ new RALLY.ui.Button({
				id : 'concurrencyReview',
				text : 'Review my changes',
				cls : 'primary small',
				handler : function() {
					lightbox.destroy();
				},
				hidden : !reviewable
			}), new RALLY.ui.Button({
				id : 'concurrencyClose',
				text : 'Close',
				cls : 'secondary small',
				handler : function() {
					window.didFormChange = function() {
						return false;
					};
					lightbox.destroy();
					window.close();
				}
			}) ]
		}) ]
	});
	lightbox.show();
}