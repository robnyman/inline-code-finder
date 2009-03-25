var icf = function () {
	var regExp = /^on/i,
		regExpStyle = /^style/i,
		regExpLink = /^javascript:/i,
		regExpClasses = /icf\-(inline\-event|inline\-style|javascript\-link)/gi,
		regExpSpaceMatch = /^\s+.*\s+$/,
		regExpSpaceReplace = /(\s+).+/,
		regExpSpaceFix = /^\s+|\s+$/g,
		prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
		classReplace = function (match) {
			var retVal = "";
			if (regExpSpaceMatch.test(match)) {
				retVal = match.replace(regExpSpaceReplace, "$1");
			}
			return retVal;
		},
		autoRunICF = function () {
			var autoRun = prefManager.getBoolPref("extensions.icf.autorun");
			if (autoRun && content.location.href !== "about:blank") {
				icf.run();
			}
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
			"-moz-border-radius : 5px"
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
			"background: url(chrome://icf/skin/checkbox-unchecked.png) no-repeat left top !important",
			"padding: 0 10px 0 20px"
		],
		innerEventListingStylesHeadersChecked = [
			"background: url(chrome://icf/skin/checkbox-checked.png) no-repeat left top !important"
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
		states = {
			
		},
		attribute,
		attrName,
		statusBarButton;
	return {
		init : function () {
			statusBarButton = document.getElementById("icf-status-bar");
			gBrowser.tabContainer.addEventListener("TabSelect", function () {
				icf.setStatusBar.apply(icf, arguments);
			}, false);
			gBrowser.addEventListener("load", function () {
				icf.clearAll.apply(icf, arguments);
				icf.clearState.apply(icf, arguments);
				gBrowser.addEventListener("load", autoRunICF, false);
			}, false);
		},
		
		getTabIndex : function () {
			var browsers = gBrowser.browsers,
				tabIndex;
			for (var i=0, il=browsers.length, browser; i<il; i++) {
				if(gBrowser.getBrowserAtIndex(i).contentWindow === content) {
					tabIndex = i;
					break;
				}
			}
			return tabIndex;
		},
		
		getState : function () {
			var tabIndex = this.getTabIndex(),
				state = states[tabIndex];
			return state;	
		},
		
		clearState : function () {
			var state = this.getState();
			if (state) {
				this.clearAll();
				state.hasRun = false;
				this.setStatusBar();
			}
		},
		
		setStatusBar : function () {
			var state = this.getState(),
				statusIcon = "chrome://icf/skin/",
				statusText;
				
			if(state && state.hasRun) {
				statusIcon += "status-bar.png";
				statusText = "Hide Inline Code Finder";
			}
			else {
				statusIcon += "status-bar-disabled.png";
				statusText = "Run Inline Code Finder";
			}
			statusBarButton.setAttribute("src", statusIcon);
			statusBarButton.setAttribute("tooltiptext", statusText);
		},
			
		run : function () {
			var state = this.getState(),
				tabIndex = this.getTabIndex();
			if(!state) {
				state = states[tabIndex] = {
					hasRun : false,
					affectedElms : []
				};
			}
			this.clearAll();
			
			if (state.hasRun) {
				state.hasRun = false;
				this.setStatusBar();
				return;
			}
			else {
				state.hasRun = true;
				this.setStatusBar();
			}
			
			var affectedElms = state.affectedElms,
				findInlineEvents = prefManager.getBoolPref("extensions.icf.inlineEvents"),
				findInlineStyle = prefManager.getBoolPref("extensions.icf.inlineStyle"),
				findJavaScriptLinks = prefManager.getBoolPref("extensions.icf.javascriptLinks"),
				highlightAllEvents = prefManager.getBoolPref("extensions.icf.highlightAllEvents"),
				inlineEventsClass = (highlightAllEvents)? " class='checked'" : "";
			
			// Needed to be here to make sure HTML elements are retrieved from the active tab
			var allElms = content.document.body.getElementsByTagName("*");
			this.setStatusBar();
			
			// Creation of custom style sheet
			var styleSheet = content.document.createElement("style");
			styleSheet.id = "icf-style";
			styleSheet.type = "text/css";
			content.document.getElementsByTagName("head")[0].appendChild(styleSheet);
			
			// Append CSS rules to it
			var docStyleSheets = content.document.styleSheets,
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

			viewer = content.document.createElement("div");
			viewer.id = "icf-viewer";
			viewer.className = "icf-overlay";
			content.document.body.appendChild(viewer);
						
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
			
			report = content.document.createElement("div");
			report.id = "icf-report";
			report.className = "icf-overlay icf-overlay-report";
			
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
			content.document.body.appendChild(report);
			var icfEventTypesElm = content.document.getElementById("icf-event-types");
			if (icfEventTypesElm) {
				icfEventTypesElm.addEventListener("click", function (evt) {
					var target = evt.target,
						enabled = /checked/i.test(target.className);
					target = (target.nodeType === 3) ? target.parentNode : target;
					target.className = (!enabled)? "checked" : "";
					target.enabled = !enabled;
					icf.selectSpecificEvents(evt);
				}, false);
				icfEventTypesElm.addEventListener("mousedown", function (evt) {
					evt.preventDefault();
				}, false);
			}	
		},	

		showInfo : function (evt) {
			var viewer = content.document.getElementById("icf-viewer"),
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
			
			table = content.document.createElement("table");
			table.border = 0;
			table.cellspacing = 0;
			tableBody = content.document.createElement("tbody");
			for (var j=0, jl=attributeCollection.length, attributeInfo; j<jl; j++) {
				attributeInfo = attributeCollection[j];
				tableRow = content.document.createElement("tr");
				tableHeader = content.document.createElement("th");
				tableHeader.innerHTML = attributeInfo.attrName + ":";
				tableCell = content.document.createElement("td");
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
			var viewer = content.document.getElementById("icf-viewer");
			viewer.style.visibility = "hidden";
			viewer.style.display = "block";
			
			var viewerWidth = viewer.offsetWidth,
				xPos = (evt.clientX + 10 + content.pageXOffset),
				yPos = (evt.clientY + 10 + content.pageYOffset),
				bodyWidth = content.document.body.offsetWidth,
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
			var viewer = content.document.getElementById("icf-viewer");
			if (viewer) {
				viewer.style.display = "none";
			}
		},
		
		clear : function () {
			var styles = content.document.getElementById("icf-style");
			if (styles) {
				styles.parentNode.removeChild(styles);
			}
			var viewer = content.document.getElementById("icf-viewer");
			if (viewer && viewer.parentNode) {
				viewer.parentNode.removeChild(viewer);
			}
			var report = content.document.getElementById("icf-report");
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
			var state = this.getState();
			if (state) {
				var affectedElms = state.affectedElms;
				this.clear();
				for (var i=0, il=affectedElms.length, elm; i<il; i++) {
					elm = affectedElms[i];
					elm.className = elm.className.replace(regExpClasses, classReplace).replace(regExpSpaceFix, "");
					elm.removeEventListener("mouseover", this.showInfo, false);
					elm.removeEventListener("mouseover", this.showJavaScriptLinkInfo, false);
					elm.removeEventListener("mouseout", this.hideInfo, false);
				}
				state.affectedElms = [];
			}
		}
	};
}();

icfWrapper = {
	onMenuItemCommand : function (evt) {
		icf.run();
	},
	
	onContextMenuItemCommand : function (evt) {
		icf.run();
	},
	
	onStatusbarButtonCommand : function (evt) {
		icf.run();
	},
	
	onToolbarButtonCommand : function (evt) {
		icf.run();
	}
};

window.addEventListener("load", function () {
	icf.init.apply(icf, arguments);
}, false);