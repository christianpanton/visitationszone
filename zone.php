<?
$dir = 'zones/';
$sdir = array_diff(scandir($dir), array('..', '.'));
natsort($sdir);
$features = array();
foreach($sdir as $file){
   $data = file_get_contents($dir.$file, 0, null, null);
   $json = json_decode($data);
   if(isset($json->features[0])){
   	 $json->features[0]->properties->filename = $file;
   	 if(empty($_GET['authority']))
   	 {
   	   array_push($features, $json->features[0]);
   	 }
   	 elseif(isset($_GET['authority']) && $_GET['authority'] == $json->features[0]->properties->authority)
   	 {
	   array_push($features, $json->features[0]);
	 }
   }
}

$json->features = $features;
header('Content-Type: application/json');
echo json_encode($json);
?>
