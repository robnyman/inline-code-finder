var icf = function () {
	var hasRun = false,
		regExp = /^on/i,
		regExpStyle = /^style/i,
		regExpLink = /^javascript:/i,
		regExpClasses = /icf\-(inline\-event|inline\-style|javascript\-link)/gi,
		regExpSpaceMatch = /^\s+.*\s+$/,
		regExpSpaceReplace = /(\s+).+/,
		regExpSpaceFix = /^\s+|\s+$/g,
		allElms = $("*"),
		viewer,
		report,
		eventHandler,
		reportContent,
		inlineEvents = {
			items : 0
		},
		inlineEventElms = {
			items : 0
		},
		inlineStyles = {
			items : 0
		},
		javascriptLinks = {
			items : 0
		},
		affectedElms = [],
		
		classReplace = function (match) {
			var retVal = "";
			if (regExpSpaceMatch.test(match)) {
				retVal = match.replace(regExpSpaceReplace, "$1");
			}
			return retVal;
		},
		
		clear = function () {
			if (viewer) {
				viewer.remove();
			}
			if (report) {
				report.remove();
			}
			inlineEvents = {
				items : 0
			};
			inlineStyles = {
				items : 0
			};
			javascriptLinks = {
				items : 0
			};
		},
		
		clearAll = function () {
			clear();
			for (var i=0, il=affectedElms.length, elm; i<il; i++) {
				elm = affectedElms[i];
				elm.className = elm.className.replace(regExpClasses, classReplace).replace(regExpSpaceFix, "");
				elm.removeEventListener("mouseover", showInfo, false);
				elm.removeEventListener("mouseout", hideInfo, false);
			}
			affectedElms = [];
		},
		
		init = function () {
			clearAll();
			var autoRun = false;
			chrome.extension.sendRequest({
					item : "setIcon",
					hasRun : hasRun
				}
			);
			
			// Get autorun property
			chrome.extension.sendRequest({
					item : "autorun"
				}, 
				function (response) {
					if (response.value === "true") {
						run();
						hasRun = true;
						sendStatus();
					}
				}
			);
			
			// Action called from popup
			chrome.extension.onRequest.addListener(
				function (request, sender, sendResponse) {
					var action = request.action;
					if (action === "toggle") {
						if (hasRun) {
							clearAll();
							hasRun = false;
						}
						else {
							run();
							hasRun = true;
						}
						// Send status to update extension icon
						sendStatus();
					}
					else if (action === "getStatus") {
						sendResponse({
							hasRun : hasRun
						});
					}
				}
			);
		},
		
		sendStatus = function () {
			chrome.extension.sendRequest({
					item : "setIcon",
					hasRun : hasRun
				}
			);
		},
		
		run = function () {
			clearAll();

			viewer = $('<div id="icf-viewer" class="icf-overlay">');
			$(document.body).append(viewer);
						
			for (var i=0, il=allElms.length, elm, attributes, attribute, attrName; i<il; i++) {
				elm = allElms[i];
				if (elm.nodeType === 1) {
					attributes = elm.attributes;
					href = elm.getAttribute("href");
					for (var j=0, jl=attributes.length; j<jl; j++) {
						attribute = attributes[j];
						attrName = attribute.name;
						if(regExp.test(attrName)){
							elm.className += ((elm.className.length > 0)? " " : "") + "icf-inline-event";
							inlineEvents.items += 1;
							if (typeof inlineEvents[attrName] === "number") {
								inlineEvents[attrName] += 1;
							}
							else {
								inlineEvents[attrName] = 1;
							}
							
							if (typeof inlineEventElms[attrName] === "object") {
								inlineEventElms[attrName].push(elm);
							}
							else {
								inlineEventElms[attrName] = [elm];
							}
							
							elm.addEventListener("mouseover", showInfo, false);
							elm.addEventListener("mouseout", hideInfo, false);
							affectedElms.push(elm);
						}
					}
					if(elm.getAttribute("style")){
						elm.className += ((elm.className.length > 0)? " " : "") + "icf-inline-style";
						inlineStyles.items += 1;
						elm.addEventListener("mouseover", showInfo, false);
						elm.addEventListener("mouseout", hideInfo, false);
						affectedElms.push(elm);
					}
					if (href && regExpLink.test(href)) {
						javascriptLinks.items += 1;
						elm.className += ((elm.className.length > 0)? " " : "") + "icf-javascript-link";
						elm.addEventListener("mouseover", showInfo, false);
						elm.addEventListener("mouseout", hideInfo, false);
						affectedElms.push(elm);
					}
				}
			}
			
			report = $('<div id="icf-report" class="icf-overlay icf-overlay-report" />');
			report.click(function () {
				var newWidth = ($(this).width() > 0)? 0 : 300;
				$(this).animate({
					width : newWidth
				}, {
					duration : 100
				});
			});
			
			var icfScore = javascriptLinks.items + inlineStyles.items + inlineEvents.items;
			reportContent = "<h2>ICF Score: " + icfScore + "</h2>";
			reportContent += "<table cellspacing='0'>";
			reportContent += "<tr><th>javascript: links:</th><td><span class='javascript-links'>" + javascriptLinks.items + "</span></td></tr>";

			reportContent += "<tr><th>Inline styles:</th><td><span class='inline-styles'>" + inlineStyles.items + "</span></td></tr>";

			reportContent += "<tr><th>Inline events:</th><td><span class='inline-events'>" + inlineEvents.items + "</span></td></tr></table>";
			reportContent += "<div id='icf-event-types' class='event-types-container'><table cellspacing='0'>";
			for (eventHandler in inlineEvents) {
				if (eventHandler !== "items") {
					reportContent += "<tr><th class=\"checked\">" + eventHandler + ":</th><td>" + inlineEvents[eventHandler] + "</td></tr>";
				}
			}
			reportContent += "</table></div>";
				
			report[0].innerHTML = reportContent;
			$(document.body).append(report);
			var icfEventTypesElm = document.getElementById("icf-event-types");
			if (icfEventTypesElm) {
				icfEventTypesElm.addEventListener("click", function (evt) {
					var target = evt.target,
						enabled = /checked/i.test(target.className);
					target = (target.nodeType === 3) ? target.parentNode : target;
					target.className = (!enabled)? "checked" : "";
					target.enabled = !enabled;
					selectSpecificEvents(evt);
					evt.stopPropagation();
				}, false);
				
				icfEventTypesElm.addEventListener("mousedown", function (evt) {
					evt.preventDefault();
				}, false);
			}	
		},	

		showInfo = function (evt) {
			var attributes = this.attributes,
				attributeCollection = [],
				table,
				tableBody,
				tableRow,
				tableHeader,
				tableCell;
			for (var i=0, il=attributes.length, attribute, attrName, attrVal; i<il; i++) {
				attribute = attributes[i];
				attrName = attribute.name;
				attrVal = attribute.value;
				if(regExp.test(attrName) || regExpStyle.test(attrName) || regExpLink.test(attrVal)) {
					attributeCollection.push({
						attrName : attrName,
						attrInfo : attribute.value.replace(/;[\s\r\n]*$/, "").split(";").join("<br>")
					});
				}
			}
			viewer[0].innerHTML = "";
			
			table = document.createElement("table");
			table.border = 0;
			table.cellspacing = 0;
			tableBody = document.createElement("tbody");
			for (var j=0, jl=attributeCollection.length, attributeInfo; j<jl; j++) {
				attributeInfo = attributeCollection[j];
				tableRow = document.createElement("tr");
				tableHeader = document.createElement("th");
				tableHeader.innerHTML = attributeInfo.attrName + ":";
				tableCell = document.createElement("td");
				tableCell.innerHTML = attributeInfo.attrInfo;
				tableRow.appendChild(tableHeader);
				tableRow.appendChild(tableCell);
				tableBody.appendChild(tableRow);
			}
			table.appendChild(tableBody);
			viewer.append(table);
			positionAndShow(evt);
			evt.stopPropagation();
		},
		
		positionAndShow = function (evt) {
			viewer.hide();
			var viewerWidth = viewer.outerWidth(),
				xPos = (evt.clientX + 10 + window.pageXOffset),
				yPos = (evt.clientY + 10 + window.pageYOffset),
				bodyWidth = document.body.offsetWidth,
				rightMargin = xPos + viewerWidth;
			
			if (rightMargin > bodyWidth) {
				xPos = (bodyWidth - viewerWidth) + window.pageXOffset;
			}
			
			viewer.css({
				left : xPos,
				top : yPos
			})
			viewer.slideDown("fast");
		},
		
		selectSpecificEvents = function (evt) {
			var target = evt.target,
				event = target.innerHTML.replace(/:$/g, ""),
				eventElms = inlineEventElms[event],
				enabled = target.enabled,
				classReplace = /\s?icf\-inline\-event/;
			for (var i=0, il=eventElms.length, elm, cssClass, elmHTML; i<il; i++) {
				elm = eventElms[i];
				cssClass = elm.className;
				elmHTML = elm.innerHTML;
				if (enabled) {
					elm.className += ((cssClass.length > 0)? " " : "") + "icf-inline-event";
					elm.addEventListener("mouseover", showInfo, false);
					elm.addEventListener("mouseout", hideInfo, false);
				}
				else {
					elm.className = cssClass.replace(classReplace, "");
					if (!classReplace.test(elm.className)) {
						elm.removeEventListener("mouseover", showInfo, false);
						elm.removeEventListener("mouseout", hideInfo, false);
					}
				}
			}
		},
		
		hideInfo = function () {
			if (viewer) {
				viewer.hide();
			}
		};
	return {
		init : init
	};
}();
icf.init();