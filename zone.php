<?
$dir = 'zones/';
$sdir = array_diff(scandir($dir), array('..', '.'));

$features = array();
foreach($sdir as $file){
   $data = file_get_contents($dir.$file, 0, null, null);
   $json = json_decode($data);
   array_push($features, $json->features[0]);
}

$json->features = $features;
echo json_encode($json);
?>
