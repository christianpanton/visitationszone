var polygons = [];

var zones = [];
var layerMap = {};

var areas = {};

var authority = "";

function isPointInPoly(poly, pt){
  for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
    ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1]))
    && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
    && (c = !c);
  return c;
}

function polygonArea(poly) { 

  var latAnchor = 56;
  var lonAnchor = 10;

  var numPoints = poly.length;
  var area = 0;         // Accumulates area in the loop
  var j = numPoints-1;  // The last vertex is the 'previous' one to the first

  var PI = Math.PI;

  for (i=0; i<numPoints; i++) { 

    var xi = (poly[i][0]-lonAnchor)*( 6378137*PI/180 )*Math.cos( latAnchor*PI/180 );
    var yi = (poly[i][1]-latAnchor)*( 6378137*PI/180 );

    var xj = (poly[j][0]-lonAnchor)*( 6378137*PI/180 )*Math.cos( latAnchor*PI/180 );
    var yj = (poly[j][1]-latAnchor)*( 6378137*PI/180 );

    area = area +  (xj+xi) * (yj-yi); 
    j = i;  //j is previous vertex to i
  }
  return area/2;
}



function dateSorter(a, b){
  if (a[1] > b[1]) return 1;
  if (a[1] < b[1]) return -1;
  return 0;
}

function getDate(str){
  var strparts = str.split(" ");
  var dateparts = strparts[0].split("-");
  var timeparts = strparts[1].split(":");

  var date = new Date(parseInt(dateparts[0]), parseInt(dateparts[1]-1), parseInt(dateparts[2]), parseInt(timeparts[0]), parseInt(timeparts[1]));
  return date;
}

function niceDate(date){
  function pad(n){return n<10 ? '0'+n : n}
  var months = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
  return date.getDate() + ". " + months[date.getMonth()] + " " + (1900+date.getYear()) + " kl. " + date.getHours() + ":" + pad(date.getMinutes());
}

function formatNumber(number) {
   number = number || 0;
   return Math.max(0, number).toFixed(0).replace(/(?=(?:\d{3})+$)(?!^)/g, '.');
}


function fetchGeoJSON() {
  $.getJSON("zones.json?" + Date.now(), function(data){
     var total_days = 0;
     var total_area = 0;
     var total_population = 0;
     for(var id = 0; id < data.features.length; id++){

        var expire = getDate(data.features[id].properties.end);
        var start = getDate(data.features[id].properties.start);
        var days = (expire.getTime() - start.getTime())/1000/60/60/24;
        total_days = days + total_days;
        var authority = data.features[id].properties.authority;
        var area = data.features[id].properties.area;
        var today = new Date();
        var style = pastStyle;
        var narea = Math.abs(polygonArea(data.features[id].geometry.coordinates[0]))/10000;
        var population = data.features[id].properties.population || 0;
        var filename = data.features[id].properties.filename;
        total_area = total_area + narea;
        total_population = total_population + population;


        if(expire > today) {          polygons.push(data.features[id].geometry.coordinates[0]);
          style = activeStyle;
        }

        data.features[id].properties.id = id;
        data.features[id].properties.style = style;
        
        areas["zone-" + id] = narea;
        var validation = data.features[id].properties.validation;
        if(expire > today){
          zones.push(["<tr data-filename='"+filename+"' class='warning' id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + formatNumber(Math.round(narea)) + "</td><td>" + formatNumber(population) + "</td><td>" + niceDate(start) + "</td><td>" + niceDate(expire) + "</td><td>"+ zone_validation(validation) +"</td></tr>", expire]);
        }else{
          zones.push(["<tr data-filename='"+filename+"' id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + formatNumber(Math.round(narea)) + "</td><td>" + formatNumber(population) + "</td><td>" + niceDate(start) +"</td><td>" + niceDate(expire) + "</td><td>"+ zone_validation(validation) +"</td></tr>", expire]);
        }

    }


    zones = zones.sort(dateSorter);

    for(var i = 0; i < zones.length; i++){
      $("#zonelist").prepend(zones[i][0]);
    }
    $('[data-toggle="tooltip"]').tooltip();
    $("#total_zones").text(formatNumber(data.features.length));
    $("#total_days").text(formatNumber(total_days));
    $("#avg_area").text(formatNumber(total_area / data.features.length));
    $("#avg_population").text(formatNumber(total_population / data.features.length));
    
    var obj = L.geoJson(data, 
    {
      onEachFeature: function (feature, layer) {
        layerMap["zone-" + feature.properties.id] = layer;
        layer.setStyle(feature.properties.style);
        layer.on('click', function(e){
        showText(feature, layer);
      });
    }
    });

    obj.addTo(map);
    //map.locate({setView: true, maxZoom: 13});
  });
}


function showText(feature, layer){


    $("#infobox").show();
    var text = feature.properties.background;
    text = text.replace(/\n/g, '<br />');
    text = "<i>" + niceDate(getDate(feature.properties.start)) + " - " + niceDate(getDate(feature.properties.end)) + "</i><br /><br />" + text;
    if(feature.properties.validation !== null)
    text = text + '<footer>Kilde: <cite title="Source Title">'+feature.properties.validation+'</cite></footer>'
    map.fitBounds(layer.getBounds());
    $("#infohead").text(feature.properties.area);
    $("#infotext").html(text);
    $.scrollTo(0, 800);

    for(var l in map._layers){
      if(map._layers[l].feature) map._layers[l].setStyle(map._layers[l].feature.properties.style);
    }

    layer.setStyle(highlightStyle);


}

function onLocationFound(e) {
    var radius = e.accuracy / 2;
    var inzone = false;
    
    if(radius > 1000){
      bootstrap_alert("<strong>Oh noes!</strong> Nøjagtigheden for din position er for upræcis, prøv venligst igen.","warning");
      $("#locate").find($(".fa")).removeClass('fa-spinner fa-pulse').addClass('fa-street-view');
      return;
    }
    
    for(var index in map._layers) {
    	if(typeof map._layers[index]._mRadius !== "undefined")
    	map.removeLayer(map._layers[index]);  
    }
    
    L.circle(e.latlng, radius, me).addTo(map);
    for(var i = 0; i < polygons.length; i++){
      if(isPointInPoly(polygons[i], [e.latlng.lng, e.latlng.lat])){
        inzone = true;
      }
    }

    if(inzone){
      bootstrap_alert("Du befinder dig i øjeblikket i en visitationszone!","danger");
      $("#locate").find($(".fa")).removeClass('fa-spinner fa-pulse').addClass('fa-street-view');
    }else{
      bootstrap_alert("Du befinder dig i øjeblikket ikke i en visitationszone!","success");
      $("#locate").find($(".fa")).removeClass('fa-spinner fa-pulse').addClass('fa-street-view');
    }

}

function onLocationError(e) {
  bootstrap_alert("<strong>Oh noes!</strong> Kunne ikke bestemme din position.","warning");
  $("#locate").find($(".fa")).removeClass('fa-spinner fa-pulse').addClass('fa-street-view');
}


var map = L.map('map').setView([56, 10], 7);
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);     

var attribution = "Data from OpenStreetMap";

var activeStyle = {
    "color": "#F50F43",
    "weight": 2,
    "opacity": 0.8,
    "fillOpacity": 0.2,
    "dashArray": null
};

var pastStyle = {
    "color": "#666666",
    "weight": 1,
    "opacity": 0.4,
    "fillOpacity": 0.05,
    "dashArray": null
};

var highlightStyle = {
    "weight": 2,
    "opacity": 1,
    "fillOpacity": 0.4,
    "dashArray": "5, 5"
}

var me = {
    "color": "#0059B3",
    "weight": 3,
    "opacity": 0.9
}

var polygons = [];

$(function(){

    $("#infobox").hide();

    L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: attribution}).addTo(map);
  
    fetchGeoJSON(); 

    $(".close-alert").click(function(e){
      $(".alert").hide("fast");
    });

    $("#zonelist").click(function(e){
      var l = layerMap[e.target.parentNode.id];
      map.fitBounds(l.getBounds());
      showText(l.feature, l);
    });

    $("#locate").click(function(e){
      $(this).find($(".fa")).removeClass('fa-street-view').addClass('fa-spinner fa-pulse');
      map.locate({setView: true, maxZoom: 13});
    });
    

});

function updateZone(data){
	if (data.selectedIndex == -1)
        text = null;
    text = data.options[data.selectedIndex].value;
    if (typeof text != 'undefined') {
		updateQueryStringParam('authority',text);
    }
    reset_data();
    fetchGeoJSON();
}

function zone_validation(validation)
{
  switch(validation) {
    case 'Aktindsigt':
        type = "success";
        text = "Aktinsigt";
        break;
    case 'Nyhedsmedie':
        type = "primary";
        text = "Nyhedsmedie";
        break;
    default:
        type = "muted";
        text = "Ukendt";
  }
  return '<p class="text-'+type+'"><i data-toggle="tooltip" data-placement="left" title="'+text+'"class="fa fa-check-circle"></i></p>';
}
function reset_data()
{
	for(var index in layerMap) {
		map.removeLayer(layerMap[index]);  
    }
    zones.length = 0;
    $("#zonelist").html('');
}
function bootstrap_alert(text,type){

	$("#alert").html('<div class="alert alert-'+type+' alert-dismissible" role="alert">' +
              '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
              '<p><strong>'+text+'</strong></p>' + 
            '</div>');
    $("#alert .alert").fadeIn("slow");
}

var updateQueryStringParam = function (key, value) {
    var baseUrl = [location.protocol, '//', location.host, location.pathname].join(''),
        urlQueryString = document.location.search,
        newParam = key + '=' + value,
        params = '?' + newParam;

    // If the "search" string exists, then build params from it
    if (urlQueryString) {
        keyRegex = new RegExp('([\?&])' + key + '[^&]*');

        // If param exists already, update it
        if (urlQueryString.match(keyRegex) !== null) {
            params = urlQueryString.replace(keyRegex, "$1" + newParam);
        } else { // Otherwise, add it to end of query string
            params = urlQueryString + '&' + newParam;
        }
    }
    window.history.replaceState({}, "", baseUrl + params);
};

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}