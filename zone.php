<?
$dir = 'zones/';
if(!isset($_GET['update_zone']))
{
	$sdir = array_diff(scandir($dir), array('..', '.'));
	natsort($sdir);
}
else
{
	$sdir = array($_GET['update_zone']);
}

$features = array();
foreach($sdir as $file){
   $data = file_get_contents($dir.$file, 0, null, null);
   $json = json_decode($data);
   if(isset($json->features[0])){
   	 $json->features[0]->properties->filename = $file;
     array_push($features, $json->features[0]);   
   }
}

$json->features = $features;
header('Content-Type: application/json');
echo json_encode($json);
?>
