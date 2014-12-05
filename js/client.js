/*
Crowdfinger Mobile Application
Copyright 2014 Christopher Craven

Crowdfinger sends AJAX requests to the server and populates the view with crowdfunding campaign data
*/

// document ready
$(function() {
	$( document ).bind( "mobileinit", function() {
		// Make your jQuery Mobile framework configuration changes here!
		$.support.cors = true;
		$.mobile.allowCrossDomainPages = true;
	});
	
	$.ajaxPrefilter( "json script", function( options ) {
		options.crossDomain = true;
	});

	// initialize variables
	var startup     = $('#home_page a[href="#detail_page"]');
	var category    = localStorage.cf_category;
	var listingType = localStorage.cf_listingType ? localStorage.cf_listingType : 'ui-grid-b'; // should be 'text', 'ui-grid-a' or 'ui-grid-b'

	var cf_watch    = getData( 'cf_watch' );
	var ks_popular  = getData( 'ks_popular', category );
	if ('undefined' != typeof ks_popular) {
		if ( 0 == ks_popular.query.results.json.total_hits ) {
				ks_popular.query.results.json.projects = [];		
			}
	}
	var igg_popular = getData( 'igg_popular', iggCat(category) );

	var igg_campaigns = igg_convert( igg_popular );

	var campaigns = ks_popular.query.results.json.projects;
	var timestamp = ks_popular.query.created;
	
	//push indiegogo to kickstarter array
	$(igg_campaigns.projects).each(function(){
		campaigns.push(this);
	});
	
	// make list of favorite campaigns if available
	if ( typeof cf_watch !== 'undefined' ) {
		var watchlist = make_list( cf_watch, 'watching', listingType );
		//console.log(cf_watch.length);
		localStorage.cf_watch_length = cf_watch.length;
		// remove watched campaigns from normal listings
			console.log('before splice',campaigns.length);
		$.each(campaigns, function( key, value ) {
			console.log(key,value);
			var i = campaigns.indexOf(value);
			if ( i > -1 ) {
				campaigns.splice(key, 1);
			}
		});
		
		console.log('after splice',campaigns.length);
	}
	var listings  = '';
	/* make_list parameters
		class can be either 'listing' or 'watching'
		listingType can be 'text' or 'ui-grid-b'
	*/
	
	// attach listings to home page
	if ( "Getting Data" == startup.text() ) {
		if (typeof watchlist != undefined) {
			startup.replaceWith( watchlist );
			listings = make_list( campaigns, 'listing', listingType );
			if ($('#home_page main div.ui-grid-b').length) {
				$('#home_page main div.ui-grid-b').append( listings );
			} else {
				$('#home_page main').append( listings );
			}
		} else {
			listings = make_list( campaigns, 'listing', listingType );
			startup.replaceWith( listings );
		}
	} else {
		
		$('#home_page main').append( watchlist );
		$('#home_page main').append( listings );
	}

	console.log('campaigns',campaigns.length);
	console.log('campaign divs',$('div.listing').length);
	//$('.campaign-name').change();

	// on click, open campaign detail page
	$('a[href="#detail_page"]').click(function() {

		get_detail( campaigns, $(this)[0].id );
		// on click, save campaign to top of list
		$('#watch').click(function() {
			var key = $(this)[0].dataset.json;
			var id = $(this)[0].dataset.id;
			appendToStorage('cf_watch', id, campaigns[key]);

			$('a[href="javascript:void(0)"]').trigger('click');
			setTimeout(function() {
				location.reload(true);
					}, 1000 ); 
		});	
		// on click, remove campaign from watch list
		$('#drop').click(function(id) {
			dropFromStorage('cf_watch', $(this)[0].dataset.id);
	
			$('a[href="javascript:void(0)"]').trigger('click');
			setTimeout(function() {
				location.reload(true);
					}, 1000 ); 
			
		});	

	});	

	manageButtons();
	
}); // end of document ready

/****************
   functions
*****************/
function getCategories() {
	make_setup_page( localStorage.getItem("cf_category") );
	
	$('input:radio').click(function() {
		var category = $(this)[0].value;
		
		localStorage.cf_category = category;
		getAjax( 'kickstarter', category );
		getAjax( 'indiegogo', category );
		$('a[href="#"]').trigger('click');	
	});	
}

// gets data from local storage 
function getData( dataName, category ) {
	var source = '';
	'ks_popular' == dataName ? source = 'kickstarter' : source = 'indiegogo';
	data = localStorage.getItem( dataName );
	if ( data === null && 'cf_watch' === dataName ) return;
	if ( data === null ) {

		getAjax( source, category );	
		
	} else if ('igg_popular' == dataName){
		//console.log('getting XML data', dataName);
		return $.parseXML( data );
	} else {
		data = JSON.parse(data);
		return data;
	}
	
}

// convert XML to JSON
function igg_convert( data ) {
	data = $(data).find('div.project-card-with-friend-list');
	var igg_data = {projects: []};
	$(data).each(function(){
		var percent  = $(this).find('div.i-percent').text().trim().replace(/[^\d]/g,'');
		if ( ! percent.length ) { return; } 
		
		var id       = $(this).data('id');
		var catName  = $(this).find('a.i-category-header span').text();
		var name     = $(this).find('div.i-title').text();
		var blurb    = $(this).find('div.i-tagline').text();
		var imgLink  = $(this).find('div.i-img').data('src');
		var pledged  = $(this).find('span.currency span').text().replace(/[^\d]/g,'');
		var denom    = $(this).find('span.currency em').text();
		var timeLeft = parseInt($(this).find('div.i-time-left').text().trim());
		var url      = 'https://www.indiegogo.com' + $(this).find('a.i-project').first().attr('href');
		if (0 < parseInt(pledged) && 0 == parseInt(percent)) percent = '1';
		var goal = parseInt(pledged) / (parseInt(percent)/100);
			goal = Math.round(goal/10) * 10;
			goal = goal.toString();
			
		igg_data.projects.push(
			{'id': id, 
			'category': { 'name' : catName },
			'name': name, 
			'blurb': blurb,
			'photo': { small : imgLink }, 
			'goal': goal,
			'pledged': pledged, 
			'currency': denom, 
			'percent': percent, 
			'deadline': timeLeft,
			'urls': { 'web': { 'project': url } }
			}
		);
	});

	return igg_data;
} // end igg_convert function

// gets timestamp from local storage
function getTimestamp () {
	var data = localStorage.getItem('ks_popular');
	data = JSON.parse(data);
	return data.query.created;
}

// adds campaign to local storage
function appendToStorage( name, id, data ) {
    var oldlist = localStorage.getItem(name);
    if	( oldlist === null ) {
		var newlist = [];
		newlist.push(data);
		newlist = JSON.stringify(newlist);
	} else {
		oldlist = JSON.parse(oldlist);
		$.each(oldlist, function( key, value ) {
			if ( id == oldlist[key].id ) {
				oldlist.splice(key,1);
				return false;
			}
		}); //end loop
		oldlist.unshift(data);
		newlist = JSON.stringify(oldlist) ;
	}
    localStorage.setItem(name, newlist);
}

// drops campaign from list
function dropFromStorage( name, id ) {
	var oldlist = localStorage.getItem(name);
	oldlist = JSON.parse(oldlist);
	$.each(oldlist, function( key, value ) {
		if ( id == oldlist[key].id ) {
			oldlist.splice(key,1);
			return false;
		}
	}); //end loop
	var newlist = JSON.stringify(oldlist) ;
	localStorage.setItem(name, newlist);
}

// get the data with AJAX
function getAjax( source, category ) {
	var url = '', store = '';
	if ('kickstarter' == source) {
		url = getKsURL( category );
		store = 'ks_popular';
	} else {
		url = getIggURL( iggCat(category) );
		store = 'igg_popular';
	}
	//$('#loader').css({'background-color':'red'}).html('<h1>LOADING</h1>').show();
	// AJAX
	if ( 'igg_popular' == store ) {
		$.get(url, function(resp) {
			//$.mobile.loading('show');
			var xml = new XMLSerializer().serializeToString(resp);

			localStorage.setItem(store, xml);
			//return localStorage.getItem(store);
		}).done(function() { 
			//location.reload(true);

			refresh();
			console.log('getXML request succeeded!'); 
		});
	} else {
		$.getJSON(url, function(resp) {
			$.mobile.loading('show');
			localStorage.setItem(store, JSON.stringify(resp));
			//return localStorage.getItem(store);
			
		}).done(function() { 
			refresh();
			console.log('getJSON request succeeded!'); 
			})
		.fail(function(jqXHR, textStatus, errorThrown) { console.log( source +' getJSON request failed! ' + textStatus + ' ' + errorThrown ); })
		.always(function() { console.log('getJSON request ended!'); });
	}
}

// hack to limit number of AJAX calls before refreshing window
function refresh(){
	
	var sites = parseInt(localStorage.cf_sites);
	isNaN(sites) ? sites = 1 : sites++ ;
	if ( 2 == sites ) {
		localStorage.cf_sites = '0';			
		setTimeout(function() {
				location.reload(true);
			}, 1000 ); 
		//location.reload(true);
	} else {
		localStorage.cf_sites = sites.toString();
	}
}

// assemble the URL for AJAX
function getKsURL( category ) {
	var url = 'http%3A%2F%2Fwww.kickstarter.com%2Fdiscover%2F';
	
	if ( "Film & Video" == category ){
		category = "film%2520%26%2520video";
		
	}
	switch( category ) {
		case ( category ):
			url += 'categories%2F'+ category +'%3Fformat%3Djson';
			url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'"+url+"'%20&format=json&callback=";
			break;
		default: 
			url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'https%3A%2F%2Fwww.kickstarter.com%2Fdiscover%2Fpopular%3Fformat%3Djson'%20&format=json&callback=";
	}
	// original https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'http%3A%2F%2Fwww.kickstarter.com%2Fdiscover%2Fcategories%2Ffilm%2520%26%2520video%3Fformat%3Djson'%20&format=json&callback=
	if ( category ) {
		if ( 0 == category.indexOf('cf_search=') ){
			
			category = category.split('cf_search=');
			url = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'https%3A%2F%2Fwww.kickstarter.com%2Fdiscover%2Fadvanced%3Fstate%3Dlive%26term%3D"+
					category[1] +
					"%26format%3Djson'%20&format=json&callback=";
		}
	}
	//localStorage.ks_url = url;
	return url;
}

function getIggURL( category ) {
	var url = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22https%3A%2F%2Fwww.indiegogo.com%2Fexplore";
	var tail = "filter_status%3Dopen%22%20and%0A%20%20%20%20%20%20xpath%3D'%2F%2Fdiv%5B%40class%3D%22i-project-cards%22%5D'%20and%20compat%3D%22HTML5%22&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys%26callback=";
	if ( category ) {
		if ( 0 == category.indexOf('cf_search=') ){
			
			category = category.split('cf_search=');
			//https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22https%3A%2F%2Fwww.indiegogo.com%2Fexplore%3Ffilter_title%3Dmoney%2Bfund%26filter_status%3Dopen%22%20and%0A%20%20%20%20%20%20xpath%3D'%2F%2Fdiv%5B%40class%3D%22i-project-cards%22%5D'%20and%20compat%3D%22HTML5%22&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys
			
			url += "%3Ffilter_title%3D"+ category[1] + "%26" + tail;
		} else {
	//var format = 'xml'; // must either 'json' or 'xml' 
	//var url = https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22https%3A%2F%2Fwww.indiegogo.com%2Fexplore%2FFood%3Ffilter_status%3Dopen%22%20and%0A%20%20%20%20%20%20xpath%3D'%2F%2Fdiv%5B%40class%3D%22i-project-cards%22%5D'%20and%20compat%3D%22HTML5%22&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys
			url += "%2F"+
			category +
			"%3F" + tail;
		}
	} else {
			url += "%3Ffilter_quick%3Dpopular_all%26" + tail;
	}

	//localStorage.igg_url = url;
	return url;
}

// match kickstarter to indiegogo categories
function iggCat( category ) {
	var cats = {
		'Comics': 'Comic',
		'Crafts': 'Art',
		'Film & Video': 'Film',
		'Games': 'Gaming',
		'Journalism': 'Transmedia',
		'Publishing': 'Writing',
		'Theater': 'Theatre'
	}
	return 'undefined' != typeof cats[category] ? cats[category] : category;
	
}

// makes a list of campaign buttons with brief stats
function make_list( campaigns, myClass, type ) {
	var camp_btn = '';
	$('#home_page main div.ui-grid-b').length ? '' : camp_btn = '<div class="'+ type +'">';
	
	var offset = localStorage.cf_watch_length;
	if ('listing' == myClass && offset) {
		//console.log('watch offset',offset);
	} else {
		offset = 0;
	}
	$.each( campaigns, function( key, value ) {

		var goal = campaigns[key].goal;
		var pledged = campaigns[key].pledged;
		
		var image = ' ', side = ' ';
		if ('text' != type) {
			image = '<div style="width:100%;height:0;padding-bottom:76.75276752767528%">'+
			'<img class="ui-corner-top grid" src="'+ campaigns[key].photo.small +'" style="height:98%"></div>'; 
			isEven(key) ? side = 'a' : side = 'b';
			
			if ('ui-grid-b' == type) {
				(key+1+offset) % 3 == 1 ? side = 'a' : ''; 
				(key+1+offset) % 3 == 2 ? side = 'b' : ''; 
				(key+1+offset) % 3 == 0 ? side = 'c' : ''; 
			
			}
		}
//console.log(key, campaigns[key].name, side);
		camp_btn += '<div class="ui-corner-all '+ myClass +' ui-block-'+ side +'">'+
		image +
		'<div class="campaign-info"><p><span class="campaign-name">'+ 
		campaigns[key].name + 
		"</span></p><p class='darker smaller'><span class='campaign-category'>" + 
		campaigns[key].category.name +'</span>&nbsp;<span class="campaign-percent">'+ percent( goal, pledged  ) +'%</span>'+
		'</p></div>'+ 
		'<a href="#detail_page" style="clear: both" id="'+ 
		campaigns[key].id +
		'" data-role="button" data-transition="slide" data-icon="carat-r" data-iconpos="right" class="ui-link ui-btn ui-icon-carat-r ui-btn-icon-right ui-shadow ui-corner-all" role="button">'+
		meter(
			percent( goal, pledged  )
		) +
		'</a></div>' ;
	});
	
		$('#home_page main div.ui-grid-b').length ? '' : camp_btn += '</div>';
	
	return camp_btn;
}

function manageButtons () {
	if ('text' == localStorage.cf_listingType) {
		$('a[data-icon=bars]').attr('data-icon','grid').addClass('ui-icon-grid').removeClass('ui-icon-bars');
	}
	$('footer').on('tap', 'a[data-icon=refresh]', function() {
		setTimeout(function() {
			location.reload(true);
		}, 1000 ); 
	});
	$('footer').on('tap', 'a[data-icon=bars]', function() {
		flipGrid(this);
	});	
	$('footer').on('tap', 'a[data-icon=grid]', function() {
		flipGrid(this);
	});

	function flipGrid(elem) {
		if (localStorage.cf_listingType) {
			if ('text' == localStorage.cf_listingType) {
				localStorage.cf_listingType = 'ui-grid-b';
				$(elem).attr('data-icon','grid').toggleClass('ui-icon-grid').toggleClass('ui-icon-bars');
			} else {
				localStorage.cf_listingType = 'text';
				$(elem).attr('data-icon','bars').toggleClass('ui-icon-grid').toggleClass('ui-icon-bars');
			}
		} else {
			$(elem).attr('data-icon','grid').toggleClass('ui-icon-grid').toggleClass('ui-icon-bars');
			localStorage.cf_listingType = 'text';
		}
		setTimeout(function() {
			location.reload(true);
		}, 1000 ); 
	}
	
/* 	$('footer').on('tap', 'a[data-icon=search]', function() {
		$('#footer-search').slideToggle();
		$(this).parent().hide();
	}); */
	
	$('#dialog_search').submit(function(e){
		e.preventDefault();
		var category = $('#search_form').val();
		if ( category ) {
			category = 'cf_search=' + category.replace(/[^\w]/g, '%2B');
			getAjax( 'kickstarter', category );
			getAjax( 'indiegogo', category );
			
			localStorage.cf_category = category;
			$('a[href="#"]').trigger('click');	
			/*setTimeout(function() {
				location.reload(true);
			}, 1000 );  */
		} else {
			$('#search_form').attr('placeholder','Enter text here')
		}
	});
	// on click, create category buttons
	$('a[href="#setup_page"]').click( 
		getCategories() 
	);

}

function isEven(n) {
   return (n % 2 == 0);
}

function make_setup_page( category ) {
	var options = '<form data-role="controlgroup" data-mini="true"><div  class="ui-grid-a" style="width:50%;display:inline-block;">';
	
	$('#setup_page li').each(function(key) {
		var cat = $(this).text();
		var selected = '';

		if ( category == $(this).text() ) {
			selected = 'checked="checked" ';
		}
		if ( 8 == key ) options += '</div><div  class="ui-grid-b"  style="vertical-align: top;width:50%;display:inline-block;">';
		options += '<label data-inline="true" for="'+cat+'" >'+
					cat +
					'<input type="radio" name="category" '+ selected +' value="'+cat+'">'+
					'</label>';
	}); // end loop
	options += '</div></form>';
	$('#setup_page ul').replaceWith(options);
}

// gets details of campaign and assembles the view
function get_detail( campaigns, id ) {
			
	$.each( campaigns, function( key, value ) {
		if ( id == campaigns[key].id ) {
			// console.log(id);
			var days = campaigns[key].deadline;
			if ( 3 < days.length ) {
				days = parseInt(days);
				var now = Math.round(Date.now()/1000);
				days = Math.round((days - now) / (24*60*60));
				
			}
			$('#detail').html(
				'<span class="darker smaller">'+ campaigns[key].category.name +'</span><br>'+
				'<img src="'+ campaigns[key].photo.small +'">'+
				'<h2>'+ campaigns[key].name +'</h2>'+
				'<p>'+ campaigns[key].blurb +'</p>'+
				'<span class="darker smaller">'+ campaigns[key].currency +' </span>'+
				'<span class="darker">Goal: '+ campaigns[key].goal.formatMoney(0) +'</span>'+
				'&nbsp;&nbsp;<span>Pledged: '+ campaigns[key].pledged.formatMoney(0) +'</span>'+
				'<br><span class="darker smaller">'+ days +' days left</span><br>'+
				get_watch_btn( key, id ) +
				'<div id="share" style="cursor: pointer;float:right;margin: 6.25px 7.813px;" onclick="'+		
				'window.plugins.socialsharing.share(\''+
					campaigns[key].blurb +'\',\''+	        //message,
					campaigns[key].name +'\',\''+	        //subject,
					campaigns[key].photo.small +'\',\''+	//file,
					campaigns[key].urls.web.project +	    //url,
					//[successCallback], // e.g. function(result) {console.log('result: ' + result)}
					//[errorCallback]    // e.g. function(result) {alert('error: ' + result);
				'\')'+
				'">'+
				'<img src="images/twitter_square_black-128.png" height="35.5px"><img src="images/facebook_square_black-128.png" height="35.5px"></div>'
				);
				//localStorage.setItem(id, JSON.stringify());
			return false; // stops the loop
		}
	}); 
}

// checks to see if id string is within local storage
function in_list( name, id ) {
	var list = localStorage.getItem( name );
	if	( list !== null ) {
		if ( -1 == list.indexOf( id ) ) {
				return false;
			} else {
				return true;
			}
	} else {
		return false;
	}
}

// get buttons for detail page
function get_watch_btn( key, id ) {
	var btn;
	if ( in_list( 'cf_watch', id ) ) {
		btn = '<a href="#home_page" id="watch" data-json="'+
			key +'" data-id="'+ id +
			'" '+
			'data-role="button" data-transition="slidedown" data-icon="heart" data-iconpos="right" data-inline="true" class="ui-link ui-btn ui-icon-heart ui-btn-inline ui-mini ui-btn-icon-right ui-shadow ui-corner-all" role="button">Top</span><span class="ui-icon ui-icon-heart ui-icon-shadow">&nbsp;</span></span></a>'+

			'<a href="#home_page" id="drop" data-json="'+
			key +'" data-id="'+ id +
			'"  '+
			'data-role="button" data-transition="slidedown" data-icon="delete" data-iconpos="right" data-inline="true" class="ui-link ui-btn ui-icon-delete ui-btn-inline ui-mini ui-btn-icon-right ui-shadow ui-corner-all" role="button">Drop</span><span class="ui-icon ui-icon-delete ui-icon-shadow">&nbsp;</span></span></a>';

	} else {
		btn = '<a href="#home_page" id="watch" data-json="'+ key +'" data-id="'+ id +'" '+
			'data-role="button" data-transition="slidedown" data-icon="eye" data-iconpos="right" data-inline="true" class="ui-link ui-btn ui-icon-eye ui-btn-inline ui-mini ui-btn-icon-right ui-shadow ui-corner-all" role="button">Watch</span><span class="ui-icon ui-icon-eye ui-icon-shadow">&nbsp;</span></span></a>';

	}
	return btn;
}

// calculates percentage of the goal met
function percent( goal, pledged ) {
	goal = Math.floor(goal);
	pledged = Math.floor(pledged);
	console.log(goal);
	if ( 0 == goal || 0 == pledged ) {
		return 0;
	}
	/* if ( pledged > goal ) {
		return 100;
	} else  */{
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

$.fn.change = function(){
	console.log('change');
	$(this).text('hello-world');
}

        $.fn.textWidth = function(){
             var calc = '<span style="display:none">' + $(this).text() + '</span>';
             $('.listing').append(calc);
             var width = $('.listing').find('span:last').width();
             $('.listing').find('span:last').remove();
            return width;
        };
        
        $.fn.marquee = function(args) {
			console.log('marquee');
            var that = $(this);
            var textWidth = that.textWidth(),
                offset = that.width(),
                width = offset,
                css = {
                    'text-indent' : that.css('text-indent'),
                    'overflow' : that.css('overflow'),
                    'white-space' : that.css('white-space')
                },
                marqueeCss = {
                    'text-indent' : width,
                    'overflow' : 'hidden',
                    'white-space' : 'nowrap'
                },
                args = $.extend(true, { count: -1, speed: 1e1, leftToRight: false }, args),
                i = 0,
                stop = textWidth*-1,
                dfd = $.Deferred();
            
            function go() {
                if(!that.length) return dfd.reject();
                if(width == stop) {
                    i++;
                    if(i == args.count) {
                        that.css(css);
                        return dfd.resolve();
                    }
                    if(args.leftToRight) {
                        width = textWidth*-1;
                    } else {
                        width = offset;
                    }
                }
                that.css('text-indent', width + 'px');
                if(args.leftToRight) {
                    width++;
                } else {
                    width--;
                }
                setTimeout(go, args.speed);
            };
            if(args.leftToRight) {
                width = textWidth*-1;
                width++;
                stop = offset;
            } else {
                width--;            
            }
            that.css(marqueeCss);
            go();
            return dfd.promise();
        };
		
