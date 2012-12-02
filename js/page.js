var polygons = [];

var activeZones = [];
var pastZones = [];
var polygonMap = {};
      
function isPointInPoly(poly, pt){
  for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
    ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1]))
    && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
    && (c = !c);
  return c;
}



function niceDate(date){
  function pad(n){return n<10 ? '0'+n : n}
  var months = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
  return date.getDay() + ". " + months[date.getMonth()] + " " + (1900+date.getYear()) + " kl. " + date.getHours() + ":" + pad(date.getMinutes());
}


function fetchGeoJSON(id) {
  $.getJSON("zones/" + id + ".geojson", function(data){

        var expire = new Date(data.features[0].properties.end);
        var authority = data.features[0].properties.authority;
        var area = data.features[0].properties.area;
        var today = new Date();
        var style = pastStyle;
        var verb = "Udløber";


        if(expire > today) {
          polygons.push(data.features[0].geometry.coordinates[0]);
          style = activeStyle;
          verb = "Udløb"; 
        }

        var obj = L.geoJson(data, 
        {
          style: style,
          onEachFeature: function (feature, layer) {
            var text = feature.properties.background ;
            text = "<strong>"+feature.properties.area+"</strong><br />"+ text + "<br /><br />" + verb + ": " + niceDate(expire);
            layer.bindPopup(text);
            layer.on('click', function(e){
              map.fitBounds(e.target.getBounds());
            });
          }
        });

        polygonMap["zone-" + id] = obj;

        if(expire > today){
          activeZones.push(["<tr id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + niceDate(expire) + "</td></tr>", obj]);
        }else{
          pastZones.push(["<tr class='muted' id='zone-" + id + "'><td>" + authority + "</td><td>" + area + "</td><td>" + niceDate(expire) + "</td></tr>", obj]);
        }

        fetchGeoJSON(id + 1);

  }).error(function(){

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

function onLocationFound(e) {
    var radius = e.accuracy / 2;
    var inzone = false;

    // test location
    // e.latlng.lng = 12.539692;
    // e.latlng.lat = 55.694543;

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
    "opacity": 0.7
};

var pastStyle = {
    "color": "#666666",
    "weight": 2,
    "opacity": 0.7
};

var me = {
    "color": "#0059B3",
    "weight": 3,
    "opacity": 0.9
}

var polygons = [];

$(function(){

    L.tileLayer('http://{s}.tile.cloudmade.com/85ee5ea570b4491bbaad62c355fe4ab4/1714/256/{z}/{x}/{y}.png', {attribution: attribution}).addTo(map);
  
    fetchGeoJSON(1); 
    $(".close-alert").click(function(e){
      $(".alert").hide("fast");
    });

    $("#zonelist").click(function(e){
      var p = polygonMap[e.target.parentNode.id];
      map.fitBounds(p.getBounds());
      p.eachLayer(function(l){l.openPopup()});
    });

});
