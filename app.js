var map = L.map('map').setView([55.7558, 37.6177], 11);

var hash = new L.Hash(map);

var tiles = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Global vars
var dataPoints = [];
var mapClassList = document.getElementById('map').classList;

var heat = L.heatLayer(dataPoints).addTo(map),
	action = 'idle';

var overlay = document.getElementById("md-overlay"),
	info = document.getElementById("md-info");

window.onkeydown = function(e) {
    // SpaceBar
    if (e.code == 'Space' || e.keyCode === 32) {
        e.preventDefault();
        action = 'draw';
        mapClassList.add('paint');
    };
    // LeftCtrl
    if (e.ctrlKey || e.keyCode === 17) {
        e.preventDefault();
        action = 'erase';
        mapClassList.add('erase');
    };
};

window.onkeyup = function(e) {
    // SpaceBar
    if (e.code == 'Space' || e.keyCode === 32) {
        e.preventDefault();
        mapClassList.remove('paint');
        action = 'idle';
    };
    // LeftCtrl
    if (e.ctrlKey || e.keyCode === 17) {
        e.preventDefault();
        mapClassList.remove('erase');
        action = 'idle';
    };
};

map.on({
    mousemove: function (e) {
        if (action == 'draw') {
            dataPoints.push(e.latlng);
            heat.redraw();
        };
        if (action == 'erase' && dataPoints != []) {
            var dataPointsfiltered = dataPoints.filter(function(p) {
            	// Tolerance for zoom level 18
                var tolerance = 0.0001,
                	inverted_zoom = 18 - map.getZoom();
                return calcLength(p, e.latlng) > 0.0001 * Math.pow(2, inverted_zoom);
            });
            dataPoints = dataPointsfiltered;
            heat.setLatLngs(dataPoints);
            heat.redraw();
        }
    }
});

var saveControl = L.Control.extend({
    options: {
        position: 'topright'
    },
    
    onAdd: function (map) {
        // create the control container with a particular class name
        var container = L.DomUtil.create('div', 'save-control');
        
        // ... initialize other DOM elements, add listeners, etc.
        container.innerHTML = '<button id="save">Save data</button>';
        L.DomEvent
        .on(container.firstChild, 'click', function(e) {
            var saveLink = document.createElement('a');
                blob = new Blob([JSON.stringify(dataPoints)], {type : 'application/json'});
                blobUrl = URL.createObjectURL(blob);
            saveLink.href = blobUrl;
            saveLink.download = 'DataPoints.json';
            document.body.appendChild(saveLink);
            saveLink.click();
            setTimeout(function() {
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(saveLink);
            }, 300);
        });
        
        return container;
    }
});
    
map.addControl(new saveControl());

var infoControl = L.Control.extend({
    options: {
        position: 'bottomright'
    },
    
    onAdd: function (map) {
        // create the control container with a particular class name
        var container = L.DomUtil.create('div', 'info-control');
        
        // ... initialize other DOM elements, add listeners, etc.
        container.innerHTML = '<button id="info" class="info">i</button>';
        L.DomEvent
        .on(container.firstChild, 'click', function(e) {
        	overlay.classList.toggle('md-show');
        	info.classList.toggle('md-show');
        });
        
        return container;
    }
});
    
map.addControl(new infoControl());

// Modal close
var closeBtn = document.getElementById("md-close");
closeBtn.addEventListener('click', function(e) {
	info.classList.toggle('md-show');
	overlay.classList.toggle('md-show');
});

/* Drag'n Drop */
var dropArea = document.getElementById('map');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

dropArea.addEventListener('drop', handleDrop, false)

function handleDrop(e) {
	var dt = e.dataTransfer,
		files = dt.files,
		file = files.item(0);

	var reader = new FileReader();
	reader.readAsText(file);

	// Show overlay while big files uploading
	reader.onloadstart = function() {
		overlay.classList.toggle('md-show');
	};
	
	reader.onloadend = function() {
		var data = JSON.parse(reader.result);
		// Merge current points with points from file
		dataPoints = dataPoints.concat(data);
		heat.setLatLngs(dataPoints);
		heat.redraw();
		// Hide overlay after big file uploaded
		overlay.classList.toggle('md-show');
	};

};

// Distance between points
function calcLength(p1,p2) {
    var d = Math.sqrt(Math.pow(p1.lat- p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
    return d;
};