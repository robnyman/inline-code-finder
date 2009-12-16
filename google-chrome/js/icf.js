var icf = function () {
	var regExp = /^on/i,
		regExpStyle = /^style/i,
		regExpLink = /^javascript:/i,
		regExpClasses = /icf\-(inline\-event|inline\-style|javascript\-link)/gi,
		regExpSpaceMatch = /^\s+.*\s+$/,
		regExpSpaceReplace = /(\s+).+/,
		regExpSpaceFix = /^\s+|\s+$/g,
		classReplace = function (match) {
			var retVal = "";
			if (regExpSpaceMatch.test(match)) {
				retVal = match.replace(regExpSpaceReplace, "$1");
			}
			return retVal;
		},
		autoRunICF = function () {
			var autoRun = true;
			chrome.extension.sendRequest({
					item: "autorun"
				}, function (response) {
					if (response.value === "true") {
						icf.run();
					}
				});
		},
		styles = [
			"position : fixed",
			"display : none",
			"min-width : 300px",
			"font : 12px Helvetica, Verdana, Arial, sans-serif",
			"color : #fff !important",
			"background : #333 !important",
			"text-align: left",
			"padding : 10px",
			"z-index : 10001",
			"opacity : 0.9",
			"-webkit-border-radius : 5px",
			"border-radius : 5px"
		],
		reportStyles = [
			"display : block",
			"width : 200px",
			"left : 0",
			"bottom : 0",
			"z-index : 10000"
		],
		reportStylesHeader = [
			"font : 18px Helvetica, Verdana, Arial, sans-serif !important",
			"color : #fff !important",
			"background : #333 !important",
			"margin : 0 0 10px 0 !important"
		],
		innerContainerStyles = [
			"text-align: left",
			"font : 12px/15px Helvetica, Verdana, Arial, sans-serif",
			"color : #fff !important",
			"background : #333 !important",
			"border: 0 !important"
		],
		innerStyles = [
			"font : 12px/15px Helvetica, Verdana, Arial, sans-serif",
			"color : #fff !important",
			"background : #333 !important",
			"vertical-align: top",
			"border: 0 !important",
			"padding: 0 10px 10px 0"
		],
		innerEventListingStyles = [
			"margin: 5px 10px 0 50px"
		],
		innerEventListingStylesHeadersAndCells = [
			"vertical-align: top",
			"padding-bottom: 5px"
		],
		innerEventListingStylesHeaders = [
			"width: 100px",
			"text-align: left",
			"cursor: pointer",
			"background: url(" + chrome.extension.getURL("images/checkbox-unchecked.png") + ") no-repeat left top !important",
			"padding: 0 10px 0 20px"
		],
		innerEventListingStylesHeadersChecked = [
			"background: url(" + chrome.extension.getURL("images/checkbox-checked.png") + ") no-repeat left top !important",
		],
		innerEventListingStylesCells = [
			"text-align: right"
		],
		innerEventListingStylesColorsJavaScriptLinks = [
			"padding-right: 5px",
			"border-right: 10px solid magenta"
		],
		innerEventListingStylesColorsInlineStyles = [
			"padding-right: 5px",
			"border-right: 10px solid #0f0"
		],
		innerEventListingStylesColorsInlineEvents = [
			"padding-right: 5px",
			"border-right: 10px solid red"
		],
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
		inlineEventElmStyle = [
			"outline : 2px solid red !important"
		],
		inlineStyleElmStyle = [
			"outline : 2px solid #0f0 !important"
		],		
		javascriptLinksElmStyle = [
			"outline : 2px solid magenta !important"
		],
		attribute,
		attrName,
		statusBarButton,
		affectedElms = [];
	return {
		init : function () {
			icf.clearAll.apply(icf, arguments);
			autoRunICF();
		},
			
		run : function () {
			this.clearAll();
			
			var findInlineEvents = true,
				findInlineStyle = true,
				findJavaScriptLinks = true,
				highlightAllEvents = true,
				inlineEventsClass = (highlightAllEvents)? " class='checked'" : "";
			
			var allElms = document.body.getElementsByTagName("*");
			
			// Creation of custom style sheet
			var styleSheet = document.createElement("style");
			styleSheet.id = "icf-style";
			styleSheet.type = "text/css";
			document.getElementsByTagName("head")[0].appendChild(styleSheet);
			
			// Append CSS rules to it
			var docStyleSheets = document.styleSheets,
				lastStyleSheet = docStyleSheets.length - 1;
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay {" + styles.join(";\n") + "}"), 0);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report {" + reportStyles.join(";\n") + "}"), 1);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report h2 {" + reportStylesHeader.join(";\n") + "}"), 2);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay table {" + innerContainerStyles.join(";\n") + "}"), 3);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay th, div.icf-overlay td {" + innerStyles.join(";\n") + "}"), 4);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay .event-types-container {" + innerEventListingStyles.join(";\n") + "}"), 5);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay .event-types-container th, div.icf-overlay .event-types-container td {" + innerEventListingStylesHeadersAndCells.join(";\n") + "}"), 6);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay .event-types-container th {" + innerEventListingStylesHeaders.join(";\n") + "}"), 7);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report td, div.icf-overlay-report .event-types-container td {" + innerEventListingStylesCells.join(";\n") + "}"), 8);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report span.javascript-links {" + innerEventListingStylesColorsJavaScriptLinks.join(";\n") + "}"), 9);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report span.inline-styles {" + innerEventListingStylesColorsInlineStyles.join(";\n") + "}"), 10);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay-report span.inline-events {" + innerEventListingStylesColorsInlineEvents.join(";\n") + "}"), 11);
			docStyleSheets[lastStyleSheet].insertRule((".icf-inline-event {" + inlineEventElmStyle.join(";\n") + "}"), 12);
			docStyleSheets[lastStyleSheet].insertRule((".icf-inline-style {" + inlineStyleElmStyle.join(";\n") + "}"), 13);
			docStyleSheets[lastStyleSheet].insertRule((".icf-javascript-link {" + javascriptLinksElmStyle.join(";\n") + "}"), 14);
			docStyleSheets[lastStyleSheet].insertRule(("div.icf-overlay .event-types-container th.checked {" + innerEventListingStylesHeadersChecked.join(";\n") + "}"), 15);
			
			var viewer,
				report,
				elm,
				href,
				attributes,
				attribute,
				attrName,
				attr,
				item,
				eventHandler,
				reportContent;

			viewer = document.createElement("div");
			viewer.id = "icf-viewer";
			viewer.className = "icf-overlay";
			document.body.appendChild(viewer);
						
			for (var i=0, il=allElms.length; i<il; i++) {
				elm = allElms[i];
				if (elm.nodeType === 1) {
					attributes = elm.attributes;
					href = elm.getAttribute("href");
					for (var j=0, jl=attributes.length; j<jl; j++) {
						attribute = attributes[j];
						attrName = attribute.name;
						if(findInlineEvents && regExp.test(attrName)){
							if (highlightAllEvents) {
								elm.className += ((elm.className.length > 0)? " " : "") + "icf-inline-event";
							}
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
							if (highlightAllEvents) {
								elm.addEventListener("mouseover", this.showInfo, false);
								elm.addEventListener("mouseout", this.hideInfo, false);
							}
							affectedElms.push(elm);
						}
					}
					if(findInlineStyle && elm.getAttribute("style")){
						elm.className += ((elm.className.length > 0)? " " : "") + "icf-inline-style";
						inlineStyles.items += 1;
						elm.addEventListener("mouseover", this.showInfo, false);
						elm.addEventListener("mouseout", this.hideInfo, false);
						affectedElms.push(elm);
					}
					if (findJavaScriptLinks && href && regExpLink.test(href)) {
						javascriptLinks.items += 1;
						elm.className += ((elm.className.length > 0)? " " : "") + "icf-javascript-link";
						elm.addEventListener("mouseover", this.showInfo, false);
						elm.addEventListener("mouseout", this.hideInfo, false);
						affectedElms.push(elm);
					}
				}
			}
			
			var icfScore = ((findJavaScriptLinks)? javascriptLinks.items : 0) + ((findInlineStyle)? inlineStyles.items : 0) + ((findInlineEvents)? inlineEvents.items : 0);
			
			report = document.createElement("div");
			report.id = "icf-report";
			report.className = "icf-overlay icf-overlay-report";
			report.onclick = function () {
				this.style.display = "none";
			};
			
			reportContent = "<h2>ICF Score: " + icfScore + "</h2>";
			reportContent += "<table cellspacing='0'>";
			if (findJavaScriptLinks) {
				reportContent += "<tr><th>javascript: links:</th><td><span class='javascript-links'>" + javascriptLinks.items + "</span></td></tr>";
			}
			if (findInlineStyle) {
				reportContent += "<tr><th>Inline styles:</th><td><span class='inline-styles'>" + inlineStyles.items + "</span></td></tr>";
			}
			if (findInlineEvents) {	
				reportContent += "<tr><th>Inline events:</th><td><span class='inline-events'>" + inlineEvents.items + "</span></td></tr></table>";
				reportContent += "<div id='icf-event-types' class='event-types-container'><table cellspacing='0'>";
				for (eventHandler in inlineEvents) {
					if (eventHandler !== "items") {
						reportContent += "<tr><th" + inlineEventsClass + ">" + eventHandler + ":</th><td>" + inlineEvents[eventHandler] + "</td></tr>";
					}
				}
				reportContent += "</table></div>";
			}
			else {
				reportContent += "</table>";
			}
			report.innerHTML = reportContent;
			document.body.appendChild(report);
			var icfEventTypesElm = document.getElementById("icf-event-types");
			if (icfEventTypesElm) {
				icfEventTypesElm.addEventListener("click", function (evt) {
					var target = evt.target,
						enabled = /checked/i.test(target.className);
					target = (target.nodeType === 3) ? target.parentNode : target;
					target.className = (!enabled)? "checked" : "";
					target.enabled = !enabled;
					icf.selectSpecificEvents(evt);
					evt.stopPropagation();
				}, false);
				icfEventTypesElm.addEventListener("mousedown", function (evt) {
					evt.preventDefault();
				}, false);
			}	
		},	

		showInfo : function (evt) {
			var viewer = document.getElementById("icf-viewer"),
				attributes = this.attributes,
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
			viewer.innerHTML = "";
			
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
			viewer.appendChild(table);
			icf.positionAndShow(evt);
			evt.stopPropagation();
		},
		
		positionAndShow : function (evt) {
			var viewer = document.getElementById("icf-viewer");
			viewer.style.visibility = "hidden";
			viewer.style.display = "block";
			
			var viewerWidth = viewer.offsetWidth,
				xPos = (evt.clientX + 10 + window.pageXOffset),
				yPos = (evt.clientY + 10 + window.pageYOffset),
				bodyWidth = document.body.offsetWidth,
				rightMargin = xPos + viewerWidth;
			
			if (rightMargin > bodyWidth) {
				xPos = bodyWidth - viewerWidth;
			}
			
			viewer.style.left = xPos + "px";	
			viewer.style.top = yPos + "px";
			viewer.style.visibility = "visible";
		},
		
		selectSpecificEvents : function (evt) {
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
					elm.addEventListener("mouseover", this.showInfo, false);
					elm.addEventListener("mouseout", this.hideInfo, false);
				}
				else {
					elm.className = cssClass.replace(classReplace, "");
					if (!classReplace.test(elm.className)) {
						elm.removeEventListener("mouseover", this.showInfo, false);
						elm.removeEventListener("mouseout", this.hideInfo, false);
					}
				}
			}
		},
		
		hideInfo : function () {
			var viewer = document.getElementById("icf-viewer");
			if (viewer) {
				viewer.style.display = "none";
			}
		},
		
		clear : function () {
			var styles = document.getElementById("icf-style");
			if (styles) {
				styles.parentNode.removeChild(styles);
			}
			var viewer = document.getElementById("icf-viewer");
			if (viewer && viewer.parentNode) {
				viewer.parentNode.removeChild(viewer);
			}
			var report = document.getElementById("icf-report");
			if (report && report.parentNode) {
				report.parentNode.removeChild(report);
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
		
		clearAll : function () {
			this.clear();
			for (var i=0, il=affectedElms.length, elm; i<il; i++) {
				elm = affectedElms[i];
				elm.className = elm.className.replace(regExpClasses, classReplace).replace(regExpSpaceFix, "");
				elm.removeEventListener("mouseover", this.showInfo, false);
				elm.removeEventListener("mouseover", this.showJavaScriptLinkInfo, false);
				elm.removeEventListener("mouseout", this.hideInfo, false);
			}
			affectedElms = [];
		}
	};
}();
icf.init.apply(icf);