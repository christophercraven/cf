/*
CrowdFinger Mobile Applet
Copyright 2014 Christopher Craven

CrowdFinger sends AJAX requests to the CrowdFinger server and populates the list view with campaigns
*/
$(function() {
	$.ajaxPrefilter( "json script", function( options ) {
	  options.crossDomain = true;
	});
	var ks_popular = localStorage.getItem("ks_popular");
	if ( ks_popular === null) {
		//$.getJSON("http://localhost:4730/", function(resp) {
		ks_popular = $.getJSON("https://www.kickstarter.com/discover/popular?format=json", function(resp) {
				localStorage.setItem('ks_popular', JSON.stringify(resp));
				var retrievedObject = localStorage.getItem('ks_popular');
				return retrievedObject;
			});
		
	}
	
	ks_popular = JSON.parse(ks_popular);
	var camp_btn = '';
	$.each( ks_popular.projects, function( key, value ) {
		camp_btn +=  '<div class="ui-corner-all listing">'+ ks_popular.projects[key].name + " : " + ks_popular.projects[key].category.name +'<a href="#detail_page" id="'+ ks_popular.projects[key].id +'" data-role="button" data-transition="slide" data-icon="carat-r" data-iconpos="right" class="ui-link ui-btn ui-icon-carat-r ui-btn-icon-right ui-shadow ui-corner-all" role="button">'+
		meter(
			percent( ks_popular.projects[key].goal, ks_popular.projects[key].pledged )
		) +
		'</a>'+'</div>' ;
	});
	$('a[href="#detail_page"]').replaceWith(camp_btn);
	console.log( ks_popular.projects );
	
	$('a[href="#detail_page"]').click(function() {
		var id = $(this)[0].id;
		$.each( ks_popular.projects, function( key, value ) {
			if ( id == ks_popular.projects[key].id ) {
				console.log(id);
				$('#detail').html(
					'<span>'+ ks_popular.projects[key].category.name +'</span><br>'+
					'<img src="'+ ks_popular.projects[key].photo.small +'">'+
					'<h2>'+ ks_popular.projects[key].name +'</h2>'+
					'<p>'+ ks_popular.projects[key].blurb +'</p>'+
					'<span>Goal: '+ ks_popular.projects[key].goal +'</span>'+
					'&nbsp;<span>Pledged: '+ ks_popular.projects[key].pledged +'</span>'
					);
				return false;
			}
			
		});
	});	
	
});

function percent( goal, pledged ) {
	if ( pledged >= goal ) {
		return 100;
	} else {
		return Math.floor( pledged / goal * 100 );
	}
}

function meter( percent ) {
	var color = 'red';
	if ( percent >= 100 ) color = 'paleturquoise';
	return '<div style="width:'+ percent +
		'%; border-bottom: 2px solid '+ color +'"></div>';

}