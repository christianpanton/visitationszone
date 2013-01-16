var polygons = [];

var activeZones = [];
var pastZones = [];
var polygonMap = {};

var areas = {};


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
  if (a[2] > b[2]) return 1;
  if (a[2] < b[2]) return -1;
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
   return Math.max(0, number).toFixed(0).replace(/(?=(?:\d{3})+$)(?!^)/g, '.');
}


function fetchGeoJSON(id) {
  $.getJSON("zones/" + id + ".geojson?" + Date.now(), function(data){

        var expire = getDate(data.features[0].properties.end);
        var start = getDate(data.features[0].properties.start);
        var authority = data.features[0].properties.authority;
        var area = data.features[0].properties.area;
        var today = new Date();
        var style = pastStyle;
        var narea = Math.abs(polygonArea(data.features[0].geometry.coordinates[0]))/10000;


        if(expire > today) {
          polygons.push(data.features[0].geometry.coordinates[0]);
          style = activeStyle;
        }

        data.features[0].properties.id = id;
        data.features[0].properties.style = style;

        var obj = L.geoJson(data, 
        {
          style: style,
          onEachFeature: function (feature, layer) {
            layer.on('click', function(e){
              showText(feature, layer);
            });
          }
        });

        areas["zone-" + id] = narea;
        polygonMap["zone-" + id] = obj;

        if(expire > today){
          activeZones.push(["<tr id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + formatNumber(Math.round(narea)) + "</td><td>" + niceDate(start) + "</td><td>" + niceDate(expire) + "</td></tr>", obj, expire]);
        }else{
          pastZones.push(["<tr class='muted' id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + formatNumber(Math.round(narea)) + "</td><td>" + niceDate(start) +"</td><td>" + niceDate(expire) + "</td></tr>", obj, expire]);
        }

        fetchGeoJSON(id + 1);

  }).error(function(e, x){

    pastZones = pastZones.sort(dateSorter);
    activeZones = activeZones.sort(dateSorter)

    for(var i = 0; i < pastZones.length; i++){
      $("#zonelist").prepend(pastZones[i][0]);
      pastZones[i][1].addTo(map);
    }

    for(var i = 0; i < activeZones.length; i++){
      $("#zonelist").prepend(activeZones[i][0]);
      activeZones[i][1].addTo(map);
    }

    map.locate({setView: true, maxZoom: 13});
  });
}


function showText(feature, layer){

    $("#infobox").show();

    var text = feature.properties.background ;
    text = text.replace(/\n/g, '<br />');
    text = "<i>" + niceDate(getDate(feature.properties.start)) + " - " + niceDate(getDate(feature.properties.end)) + "</i><br /><br />" + text ;

    map.fitBounds(layer.getBounds());
    $("#infohead").text(feature.properties.area);
    $("#infotext").html(text);

    $("#alerts").ScrollTo();


    for(var l in map._layers){
      if(map._layers[l].feature) map._layers[l].setStyle(map._layers[l].feature.properties.style);
    }

    layer.setStyle(highlightStyle);


}

function onLocationFound(e) {
    var radius = e.accuracy / 2;
    var inzone = false;
    
    if(radius > 1000){
      $("#failzone").show("fast");
      return;
    }

    L.circle(e.latlng, radius, me).addTo(map);
    
    for(var i = 0; i < polygons.length; i++){
      if(isPointInPoly(polygons[i], [e.latlng.lng, e.latlng.lat])){
        inzone = true;
      }
    }

    if(inzone){
      $("#inzone").show("fast");
    }else{
      $("#outzone").show("fast");
    }

}

function onLocationError(e) {
  $("#failzone").show("fast");
}


var map = L.map('map').setView([56, 10], 7);
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);     

var attribution = "Data from OpenStreetMap, rendered by CloudMade";

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

    L.tileLayer('http://{s}.tile.cloudmade.com/85ee5ea570b4491bbaad62c355fe4ab4/1714/256/{z}/{x}/{y}.png', {attribution: attribution}).addTo(map);
  
    fetchGeoJSON(1); 
    $(".close-alert").click(function(e){
      $(".alert").hide("fast");
    });

    $("#zonelist").click(function(e){
      var p = polygonMap[e.target.parentNode.id];
      map.fitBounds(p.getBounds());
      p.eachLayer(function(l){
        showText(l.feature, l);
      });
    });

});
