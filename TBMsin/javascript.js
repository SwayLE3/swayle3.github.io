// URL de l'API de l'arrêt spécifique
const apiUrl = "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/stop-monitoring.json?AccountKey=opendata-bordeaux-metropole-flux-gtfs-rt&MonitoringRef=bordeaux:StopPoint:BP:1633:LOC";

// La référence du point d'arrêt que vous recherchez  
const stopPointRefToFind = "bordeaux:Line:08:LOC";

// Fonction pour récupérer l'heure de départ la plus proche  
async function findStopPointRef(apiUrl, stopPointRef) {
  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    // DEBUG: Affichage des données reçues pour analyse
    //console.log("Données reçues de l'API :", data);

    // Accède aux éléments pertinents : StopMonitoringDelivery -> MonitoredStopVisit
    const monitoredStopVisits = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit;
    //const numeroligne = monitoredStopVisits.monitoredVehicleJourney.DirectionName[0].value;
    for (stopVisit of monitoredStopVisits) {
      const lineRef = stopVisit["MonitoredVehicleJourney"]["LineRef"]["value"];
      const Destination = stopVisit["MonitoredVehicleJourney"]["DestinationName"][0]["value"];
      console.log(Destination);
      document.getElementById("numeroNOM").innerHTML = Destination;
    }
    const numeroligne2 = data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0];


    if (!Array.isArray(monitoredStopVisits)) {
      console.error("Les données reçues ne contiennent pas 'MonitoredStopVisit' sous forme de tableau.");
      return null;
    }

    let closestCall = null;
    let closestTimeDiff = Infinity;

    // Parcours chaque visite surveillée
    for (const visit of monitoredStopVisits) {
      const monitoredVehicleJourney = visit.MonitoredVehicleJourney;

      // Vérifie si le véhicule correspond à la ligne recherchée
      if (monitoredVehicleJourney?.LineRef?.value === stopPointRef) {
        const monitoredCall = monitoredVehicleJourney?.MonitoredCall;

        // Si l'heure de départ est présente
        if (monitoredCall?.ExpectedDepartureTime) {
          const departureTime = new Date(monitoredCall.ExpectedDepartureTime);

          if (!isNaN(departureTime.getTime())) {
            const currentTime = new Date();
            const timeDiff = Math.abs(departureTime - currentTime);

            // Si l'heure de départ est plus proche que la précédente
            if (timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff;
              closestCall = monitoredCall;
            }
          }
        }
      }
    }

    // Mise à jour de l'affichage si un bus est trouvé
    if (closestCall) {
      const closestDate = new Date(closestCall.ExpectedDepartureTime);
      const hours = closestDate.getHours().toString().padStart(2, "0");
      const minutes = closestDate.getMinutes().toString().padStart(2, "0");

      document.getElementById("dateBUS").innerHTML = `${hours}:${minutes}`;
      console.log(`Le départ le plus proche est à ${hours}:${minutes}`);
    } else {
      console.log("Aucun départ trouvé pour cet arrêt.");
    }

    return closestCall; // Retourne le résultat trouvé (ou null si rien)
  } catch (error) {
    console.error("Erreur lors de la récupération des données :", error);
  }

  return null;
}

// Exécution après 10 secondes
setTimeout(() => {
  findStopPointRef(apiUrl, stopPointRefToFind);
}, 10000);

// Appel immédiat
findStopPointRef(apiUrl, stopPointRefToFind).then((result) => {
  if (result) {
    console.log("Point d'arrêt trouvé :", result);
  } else {
    console.log("Point d'arrêt non trouvé !");
  }
});
