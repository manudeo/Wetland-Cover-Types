//Wetland polygon 
var table = ee.FeatureCollection("users/manudeo_singh/Chilika_Lagoon"); //change this to desired wetland

//Date bounds
var startDate = '2020-10-01';
var endDate = '2020-11-15';

//Get satallite imageries collection for required dates and region (wetland) and apply a simple cloud filter
var data= ee.ImageCollection('COPERNICUS/S2_SR')
.filterDate(startDate,endDate)
.filterBounds(table)
.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20));

//Calculate median values of bands for given date range in the collection
var data_med = data.reduce(ee.Reducer.median()); 
//print(data_med);

Map.centerObject(table, 10);
//Map.addLayer(table); //visualise wetland polygon

//Clip satellite imagery raster to wetland region and visualise the FCC
var input_raster = data_med.clip(table);
Map.addLayer(input_raster, {bands: ['B8_median', 'B3_median', 'B4_median'], min: 500, max: 3500});

//Calculate WCT indices
var NDWI= input_raster.normalizedDifference(['B3_median','B8_median']);
var NDVI= input_raster.normalizedDifference(['B8_median','B4_median']);
var NDTI= input_raster.normalizedDifference(['B4_median','B3_median']);

//Reclass WCT indices in four classes

//Reclass NDWI
var NDWI_Reclass = NDWI
          .where(NDWI.lte(0), 0)
          .where(NDWI.gt(0).and(NDWI.lte(0.25)), 110000)
          .where(NDWI.gt(0.25).and(NDWI.lte(0.5)), 220000)
          .where(NDWI.gt(0.5).and(NDWI.lte(0.75)), 330000)
          .where(NDWI.gt(0.75), 440000);
          
//Reclass NDVI
var NDVI_Reclass = NDVI
          .where(NDVI.lte(0), 0)
          .where(NDVI.gt(0).and(NDVI.lte(0.25)), 1100)
          .where(NDVI.gt(0.25).and(NDVI.lte(0.5)), 2200)
          .where(NDVI.gt(0.5).and(NDVI.lte(0.75)), 3300)
          .where(NDVI.gt(0.75), 4400);
          
//Reclass NDTI
var NDTI_Reclass = NDTI
          .where(NDTI.lte(0), 0)
          .where(NDTI.gt(0).and(NDTI.lte(0.25)), 11)
          .where(NDTI.gt(0.25).and(NDTI.lte(0.5)), 22)
          .where(NDTI.gt(0.5).and(NDTI.lte(0.75)), 33)
          .where(NDTI.gt(0.75), 44);
          
//Calculate WCTs
var wct_int = (
  NDWI_Reclass
.add(NDVI_Reclass)
.add(NDTI_Reclass)
.rename('WCT'))
.int(
);

// Get the date range of images in the collection.
var range = data.reduceColumns(ee.Reducer.minMax(), 
["system:time_start"]);
var time = ('Date range: ', [ee.Date(range.get('min')), 
ee.Date(range.get('max'))]);
print(time);

//Get the list of WCTs
var reduction = wct_int.reduceRegion({
  reducer:ee.Reducer.frequencyHistogram(),
  geometry: table,
  scale: 10
  });

var wctVals = ee.Dictionary(reduction.get(wct_int.bandNames().get(0)))
    .keys()
    .map(ee.Number.parse);
print(wctVals);

//Visualise the WCT layer
var wctViz = {min: 11, max: 444444, palette: ['orange', 'green', 'blue']};
Map.addLayer(wct_int, wctViz, 'WCT', true);

//Export output to Google Drive
Export.image.toDrive({
  image: wct_int,
  description: 'wct',
  scale: 10,
  region: table,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});
