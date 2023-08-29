import re
import os
import json
import functools

import pyproj
import numpy
import scipy.spatial

from shapely.geometry import shape, Point
from shapely.ops import transform

PATH = "zones/"
zonefiles = os.listdir(PATH)

sp = pyproj.Proj("EPSG:3035")
dp = pyproj.Proj("EPSG:4326")

matcher = re.compile(",1kmN|E")

points = []
X = []
Y = []
P = []

for line in open("build/population.csv", "r"):

    pop, y, x = map(float, matcher.split(line.strip()))
    x = x * 1e3 + 500
    y = y * 1e3 + 500
    points.append((Point(x, y), pop))
    X.append(x)
    Y.append(y)
    P.append(pop)

kdtree = scipy.spatial.KDTree(list(zip(X, Y)))

master = {
    "type": "FeatureCollection",
    "features": []
}

for filename in zonefiles:
    data = json.load(open(PATH + filename))
    master["features"].append(data["features"][0])
    if "population" in data["features"][0]["properties"]:
        continue
    zone = shape(data["features"][0]["geometry"])
    proj = functools.partial(pyproj.transform, dp, sp)
    zone_m = transform(proj, zone)
    area = zone_m.area / (1000 * 1000)

    density = []
    for point, pop in points:
        if zone_m.contains(point):
            density.append(pop)

    if len(density) > 0:
        density = numpy.mean(density)
    else:
        idx = kdtree.query(zone_m.bounds[:2])
        density = P[idx[1]]

    pop = int((density * area) / 100) * 100
    data["features"][0]["properties"]["population"] = pop
    json.dump(data, open(PATH + filename, "w"), indent=4)

with open("zones.json", "w") as f:
    f.write(json.dumps(master))
    
nextid = max(map(lambda x: int(x[:4]), zonefiles)) + 1
nextname = "%04d.geojson" % nextid

with open("nextname.json", "w") as f:
    f.write(json.dumps({"next": nextname}))
