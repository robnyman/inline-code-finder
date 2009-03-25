/*global FBL */
FBL.ns(function () {
	with (FBL) {
		var panelName = "icffirebug";
		
		window.addEventListener("load", function () {
			gBrowser.addEventListener("load", autoRunICF, false);
		}, false);
		
		function autoRunICF () {
			var autoRun = Firebug.getPref(Firebug.prefDomain, "icffirebug.autorun");
			if (autoRun && content.location.href !== "about:blank") {
				if (typeof icffirebug !== "undefined") {
					icffirebug.autorun = true;
				}
				var runButton = document.getElementById("icfRunButton");
				runButton.click();
			}
			else {
				var clearButton = document.getElementById("icfClearButton");
				clearButton.click();
			}
		}
		
		Firebug.icfModel = extend(Firebug.Module, {
		    showPanel: function(browser, panel) {
				var isPanel = panel && panel.name === panelName;
				var ojcsButtons = browser.chrome.$("fbicfButtons");
				collapse(ojcsButtons, !isPanel);
		    },
		
			addStyleSheet : function (doc) {
				var styleSheet = document.getElementById("icf-firebug-style");
				if (!styleSheet) {
					styleSheet = createStyleSheet(doc, "chrome://icffirebug/skin/icf-firebug.css");
					styleSheet.id = "icf-firebug-style";
					addStyleSheet(doc, styleSheet);
				}
			},

		   	onRun: function (context, results) {
		        var panel = context.getPanel(panelName),
					parentNode = panel.panelNode,
					results = results || icffirebug.run(),
					findInlineEvents = Firebug.getPref(Firebug.prefDomain, "icffirebug.inlineEvents"),
					findInlineStyle = Firebug.getPref(Firebug.prefDomain, "icffirebug.inlineStyle"),
					findJavaScriptLinks = Firebug.getPref(Firebug.prefDomain, "icffirebug.javascriptLinks"),
					highlightAllEvents = Firebug.getPref(Firebug.prefDomain, "icffirebug.highlightAllEvents"),
					inlineEventsClass = (highlightAllEvents)? " class='checked'" : "";
				
				if (results && (results.events || results.styles || results.links)) {
					if (!results.autorun) {
						var browser = FirebugChrome.getCurrentBrowser();
						browser.chrome.selectPanel(panelName);
						Firebug.toggleBar(true, panelName);
					}
					
					var inlineEvents = "<table cellspacing='0'>";
					for (eventHandler in results.events) {
						if (eventHandler !== "items") {
							inlineEvents += "<tr><th colspan='2'" + inlineEventsClass + ">" + eventHandler + ":</th><td>" + results.events[eventHandler] + "</td></tr>";
						}
					}
					inlineEvents += "</table>";
					var icfScore = ((findJavaScriptLinks)? results.links.items : 0) + ((findInlineStyle)? results.styles.items : 0) + ((findInlineEvents)? results.events.items : 0);
					var ojcsReport = domplate({
						reportListing:
						DIV({class: "icf-result-container"},
								H2(
									{},
									"ICF Score: " + icfScore
								),
								TABLE(
									{cellspacing: 0},
									TR(
										{class: (findJavaScriptLinks)? "label" : "icf-display-none"},
										TH(
											{},
											"javascript: links:"
										),
										TD(
											{},
											SPAN(
												{class: "javascript-links"}, 
												results.links.items
											)	
										)
									),
									TR(
										{class: (findInlineStyle)? "label" : "icf-display-none"},
										TH(
											{},
											"Inline styles:"
										),
										TD(
											{},
											SPAN(
												{class: "inline-styles"},
												results.styles.items
											)	
										)
									),
									TR(
										{class: (findInlineEvents)? "label" : "icf-display-none"},
										TH(
											{},
											"Inline events:"
										),
										TD(
											{},
											SPAN(
												{class: "inline-events"},
												results.events.items
											)	
										)
									)
								),
								DIV(
									{
										class: (findInlineEvents)? "event-types-container" : "icf-display-none",
										onclick : function (evt) {
											var target = evt.target,
												enabled = /checked/i.test(target.className);
											target.className = (!enabled)? "checked" : "";
											target.enabled = !enabled;
											icffirebug.selectSpecificEvents(evt);
											
										},
										onmousedown : function (evt) {
											evt.preventDefault();
										}
									}, 
									inlineEvents
								)
					        )
					});
					var rootTemplateElement = ojcsReport.reportListing.replace({}, parentNode, ojcsReport);
				}
				else {
					this.onClear.call(this, context);
				}
				if (typeof icffirebug !== "undefined") {
					icffirebug.autorun = false;
				}
		    },
		
			onToggle : function (context) {
				var results = icffirebug.toggle();
				this.onRun.call(this, context, results);
			},
		
			onClear: function (context) {
				var browser = FirebugChrome.getCurrentBrowser();
				//browser.chrome.selectPanel(panelName);
				
		        var panel = context.getPanel(panelName);
			    var parentNode = panel.panelNode;
				icffirebug.clearAll();
				icffirebug.clearState();
				var ojcsReport = domplate({
					reportListing :
						DIV({class: "icf-result-container"},
							H1({}, "Inline Code Finder for Firebug"),
							DIV({class: "instructions"}, 
								P({}, "Click Run or Toggle above in the menu bar to activate Inline Code Finder"),
								P({}, "Enable/disable Autorun and set what to look for under the Options menu to the right")
							)
						)	
				});
				var rootTemplateElement = ojcsReport.reportListing.replace({}, parentNode, "");
		    },
		
			onHide: function (context) {
				Firebug.toggleBar(false, panelName);
		    }
		});
			
		
		function icfPanel () {
			
		}
		icfPanel.prototype = extend(Firebug.Panel, {
			name : panelName,
			title : "Inline Code Finder",
			initialize : function () {
				Firebug.Panel.initialize.apply(this, arguments);
				Firebug.icfModel.addStyleSheet(this.document);
				icffirebug.init();
			},
			
			getOptionsMenuItems : function () {
				return [
					this.optionsMenuItem("Autorun", "icffirebug.autorun"),
					this.optionsMenuItem("Inline JavaScript Events", "icffirebug.inlineEvents"),
					this.optionsMenuItem("Inline Style", "icffirebug.inlineStyle"),
					this.optionsMenuItem("javascript: links", "icffirebug.javascriptLinks"),
					this.optionsMenuItem("Highlight all events", "icffirebug.highlightAllEvents")
				];
			},
			
			optionsMenuItem : function  (text, option) {
				var pref = Firebug.getPref(Firebug.prefDomain, option);
				return {
					label : text,
					type : "checkbox",
					checked : pref,
					command : bindFixed(Firebug.setPref, this, Firebug.prefDomain, option, !pref)
				};
			}
		});
		
		Firebug.registerModule(Firebug.icfModel);
		Firebug.registerPanel(icfPanel);
	}
});

var icffirebug = function () {
	var regExp = /^on/i,
		regExpStyle = /^style/i,
		regExpLink = /^javascript:/i,
		regExpClasses = /icffirebug\-(inline\-event|inline\-style|javascript\-link)/gi,
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
		styles = [
			"position : absolute",
			"display : none",
			"min-width : 300px",
			"font : 12px Helvetica, Verdana, Arial, sans-serif",
			"color : #fff !important",
			"background : #333 !important",
			"text-align: left",
			"padding : 10px",
			"z-index : 10000",
			"opacity : 0.9",
			"-moz-border-radius : 5px"
		],
		reportStyles = [
			"position : fixed",
			"display : block",
			"width : 200px",
			"left : 0",
			"bottom : 0"
		],
		innerContainerStyles = [
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
		attrName;
	return {
		autorun : false,
		
		init : function () {
			content.addEventListener("unload", function () {
				icffirebug.clearAll.apply(icffirebug, arguments);
				icffirebug.clearState.apply(icffirebug, arguments);
			}, false);
		},
		
		getTabIndex : function () {
			var browsers = gBrowser.browsers,
				tabIndex;
			for (var i=0, il=browsers.length; i<il; i++) {
				if(gBrowser.getBrowserAtIndex(i).contentWindow == content) {
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
			}
		},
		
		toggle : function  () {
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
				this.clearAll();
				return {};
			}
			else {
				state.hasRun = true;
				return this.run();
			}
		},
			
		run : function () {
			var state = this.getState(),
				tabIndex = this.getTabIndex(),
				findInlineEvents = Firebug.getPref(Firebug.prefDomain, "icffirebug.inlineEvents"),
				findInlineStyle = Firebug.getPref(Firebug.prefDomain, "icffirebug.inlineStyle"),
				findJavaScriptLinks = Firebug.getPref(Firebug.prefDomain, "icffirebug.javascriptLinks"),
				highlightAllEvents = Firebug.getPref(Firebug.prefDomain, "icffirebug.highlightAllEvents");
			
			if(!state) {
				state = states[tabIndex] = {
					affectedElms : []
				};
			}
			state.hasRun = true;
			this.clearAll();
			
			var affectedElms = state.affectedElms;
			
			// Needed to be here to make sure HTML elements are retrieved from the active tab
			var allElms = content.document.body.getElementsByTagName("*");
			
			// Creation of custom style sheet
			var styleSheet = content.document.createElement("style");
			styleSheet.id = "icffirebug-style";
			styleSheet.type = "text/css";
			content.document.getElementsByTagName("head")[0].appendChild(styleSheet);
			
			// Append CSS rules to it
			var docStyleSheets = content.document.styleSheets,
				lastStyleSheet = docStyleSheets.length - 1;
			docStyleSheets[lastStyleSheet].insertRule(("div.icffirebug-overlay {" + styles.join(";\n") + "}"), 0);
			docStyleSheets[lastStyleSheet].insertRule(("div.icffirebug-overlay-report {" + reportStyles.join(";\n") + "}"), 1);
			docStyleSheets[lastStyleSheet].insertRule(("div.icffirebug-overlay table {" + innerContainerStyles.join(";\n") + "}"), 2);
			docStyleSheets[lastStyleSheet].insertRule(("div.icffirebug-overlay th, div.icffirebug-overlay td {" + innerStyles.join(";\n") + "}"), 3);
			docStyleSheets[lastStyleSheet].insertRule((".icffirebug-inline-event {" + inlineEventElmStyle.join(";\n") + "}"), 4);
			docStyleSheets[lastStyleSheet].insertRule((".icffirebug-inline-style {" + inlineStyleElmStyle.join(";\n") + "}"), 5);
			docStyleSheets[lastStyleSheet].insertRule((".icffirebug-javascript-link {" + javascriptLinksElmStyle.join(";\n") + "}"), 6);
			
			var viewer,
				report,
				elm,
				href,
				attributes,
				attribute,
				attrName,
				attr,
				item,
				eventHandler;

			viewer = content.document.createElement("div");
			viewer.id = "icffirebug-viewer";
			viewer.className = "icffirebug-overlay";
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
								elm.className += ((elm.className.length > 0)? " " : "") + "icffirebug-inline-event";
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
						elm.className += ((elm.className.length > 0)? " " : "") + "icffirebug-inline-style";
						inlineStyles.items += 1;
						elm.addEventListener("mouseover", this.showInfo, false);
						elm.addEventListener("mouseout", this.hideInfo, false);
						affectedElms.push(elm);
					}
					if (findJavaScriptLinks && href && regExpLink.test(href)) {
						elm.className += ((elm.className.length > 0)? " " : "") + "icffirebug-javascript-link";
						javascriptLinks.items += 1;
						elm.addEventListener("mouseover", this.showInfo, false);
						elm.addEventListener("mouseout", this.hideInfo, false);
						affectedElms.push(elm);
					}
				}
			}
			
			//alert(javascriptLinks.items);
			
			report = content.document.createElement("div");
			report.id = "icffirebug-report";
			report.className = "icffirebug-overlay icffirebug-overlay-report";
			report.innerHTML = "<p><b>Number of javascript: links:</b> " + javascriptLinks.items + "</p>";
			report.innerHTML += "<p><b>Number of inline events:</b> " + inlineEvents.items + "</p>";
			for (eventHandler in inlineEvents) {
				if (eventHandler !== "items") {
					report.innerHTML += "<p style='margin-left: 20px'>" + eventHandler + ": " + inlineEvents[eventHandler] + "</p>";
				}
			}
			return {
				links : javascriptLinks,
				styles : inlineStyles,
				events : inlineEvents,
				autorun : this.autorun
			};
		},	

		showInfo : function (evt) {
			var viewer = content.document.getElementById("icffirebug-viewer"),
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
			icffirebug.positionAndShow(evt);
			evt.stopPropagation();
		},
		
		positionAndShow : function (evt) {
			var viewer = content.document.getElementById("icffirebug-viewer");
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
				classReplace = /\s?icffirebug\-inline\-event/;
			for (var i=0, il=eventElms.length, elm, cssClass, elmHTML; i<il; i++) {
				elm = eventElms[i];
				cssClass = elm.className;
				elmHTML = elm.innerHTML;
				if (enabled) {
					elm.className += ((cssClass.length > 0)? " " : "") + "icffirebug-inline-event";
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
			var viewer = content.document.getElementById("icffirebug-viewer");
			if (viewer) {
				viewer.style.display = "none";
			}
		},
		
		clear : function () {
			var styles = content.document.getElementById("icffirebug-style");
			if (styles) {
				styles.parentNode.removeChild(styles);
			}
			var viewer = content.document.getElementById("icffirebug-viewer");
			if (viewer && viewer.parentNode) {
				viewer.parentNode.removeChild(viewer);
			}
			var report = content.document.getElementById("icffirebug-report");
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