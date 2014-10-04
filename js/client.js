/*
Crowdfinger Mobile Applet
Copyright 2014 Christopher Craven

Crowdfinger sends AJAX requests to the server and populates the list view with campaigns
*/
// on document ready
$(function() {
	$.ajaxPrefilter( "json script", function( options ) {
	  options.crossDomain = true;
	});

	var startup = $('#home_page a[href="#detail_page"]');
	var ks_popular = localStorage.getItem("ks_popular");
	if ( ks_popular === null) {
		ks_popular = refresh();	
		if( ks_popular == undefined ) {

			setTimeout(function() {
				location.reload();
				}, 3000 );
			//console.log(ks_popular);
		} 
	} else {
		ks_popular = JSON.parse(ks_popular);
	}
	
	var campaigns = ks_popular.query.results.json.projects;
	var listings = make_list( campaigns );
	
	if ( "Getting Data" == startup.text() ) {
		startup.replaceWith( listings );
	} else {
		$('#home_page main').append( listings );
	}
	
	// on click, open campaign detail page
	$('a[href="#detail_page"]').click(function() {
		get_detail( campaigns, $(this)[0].id );
		
		$('#watch').click(function() {
			var key = $(this)[0].dataset.json;
			var id = $(this)[0].dataset.id;
			appendToStorage('cf_watch', id, campaigns[key]);
		});	
	});	
	// on click, save campaign to top of list

	

	
}); // end of document ready
/****************
   functions
*****************/
function appendToStorage(name, id, data){
    var oldlist = localStorage.getItem(name);
    if	( oldlist === null ) {
		var newlist = [];
		newlist.push(data);
		newlist = JSON.stringify(newlist);
	} else {
				//console.log(oldlist);
		oldlist = JSON.parse(oldlist);
		$.each(oldlist, function( key, value ) {
			if ( id == oldlist[key].id ) {
				console.log( "match found in old list" );
				oldlist.splice(key,1);
				return false;
			}
		}); //end loop
		//console.log(oldlist);
		oldlist.push(data);
		newlist = JSON.stringify(oldlist) ;
	}
    localStorage.setItem(name, newlist);
}

// refresh the data 
function refresh() {
	var url = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'https%3A%2F%2Fwww.kickstarter.com%2Fdiscover%2Fpopular%3Fformat%3Djson'%20&format=json&callback=";
 	$.getJSON(url, function(resp) {
		localStorage.setItem('ks_popular', JSON.stringify(resp));
		return localStorage.getItem("ks_popular");
		
	}); 
}
// makes a list of campaign buttons with brief stats
function make_list( campaigns ) {
	var camp_btn = '';
	$.each( campaigns, function( key, value ) {
		camp_btn +=  '<div class="ui-corner-all listing">'+
		'<p>'+ 
		campaigns[key].name + 
		" &nbsp; <span class='darker smaller'>" + 
		campaigns[key].category.name +
		'</span></p>'+ 
		'<a href="#detail_page" id="'+ 
		campaigns[key].id +
		'" data-role="button" data-transition="slide" data-icon="carat-r" data-iconpos="right" class="ui-link ui-btn ui-icon-carat-r ui-btn-icon-right ui-shadow ui-corner-all" role="button">'+
		meter(
			percent( campaigns[key].goal, campaigns[key].pledged )
		) +
		'</a>'+'</div>' ;
	});
	return camp_btn;
}
// gets details of campaign and assembles the view
function get_detail( campaigns, id ) {
			
	$.each( campaigns, function( key, value ) {
		if ( id == campaigns[key].id ) {
			// console.log(id);
			$('#detail').html(
				'<span class="darker smaller">'+ campaigns[key].category.name +'</span><br>'+
				'<img src="'+ campaigns[key].photo.small +'">'+
				'<h2>'+ campaigns[key].name +'</h2>'+
				'<p>'+ campaigns[key].blurb +'</p>'+
				'<span class="darker">Goal: '+ campaigns[key].goal.formatMoney(0) +'</span>'+
				'&nbsp;&nbsp;<span>Pledged: '+ campaigns[key].pledged.formatMoney(0) +'</span>'+
				'<a href="#home_page" id="watch" data-json="'+ key +'" data-id="'+ id +'" data-role="button" data-icon="eye" data-iconpos="right" class="ui-link ui-btn ui-icon-eye" role="button">Watch</a>'
				);
				//localStorage.setItem(id, JSON.stringify());
			return false; // stops the loop
		}
	}); 
}
// calculates percentage of the goal met
function percent( goal, pledged ) {
	if ( pledged >= goal ) {
		return 100;
	} else {
		return Math.floor( pledged / goal * 100 );
	}
}
// draws a view of the percentage as a horizontal line
function meter( percent ) {
	var color = 'red';
	if ( percent >= 100 ) color = 'paleturquoise';
	return '<div style="width:'+ percent +
		'%; border-bottom: 2px solid '+ color +'"></div>';

}
// formats money with commas. c = precision, d = decimal, t = thousand. Thanks to Patrick Desjardins
String.prototype.formatMoney = function(c, d, t){
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 }