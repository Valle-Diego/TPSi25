var url = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json";
var richiesta = new XMLHttpRequest();

richiesta.open("GET", url, true);

richiesta.onreadystatechange = function () {
  if (richiesta.readyState == 4 && richiesta.status == 200) {
    var dati = JSON.parse(richiesta.responseText);
    var chiavi = Object.keys(dati[0]);
    var colonne = ["data", "nuovi_positivi", "terapia_intensiva", "deceduti", "totale_casi"];
    var testoChiavi = "";
    var intestazione = "<tr>";
    var righe = "";
    var i;
    var j;

    // Stampa tutte le chiavi del JSON.
    for (i = 0; i < chiavi.length; i++) {
      testoChiavi += "<tr><td>" + chiavi[i] + "</td></tr>";
    }
    document.getElementById("tabella-chiavi").innerHTML = testoChiavi;

    // Crea l'intestazione della tabella dei dati.
    for (i = 0; i < colonne.length; i++) {
      intestazione += "<th>" + colonne[i] + "</th>";
    }
    intestazione += "</tr>";
    document.getElementById("intestazione-dati").innerHTML = intestazione;

    // Stampa gli ultimi 20 rilevamenti.
    for (i = dati.length - 1; i >= 0 && i >= dati.length - 20; i--) {
      righe += "<tr>";
      for (j = 0; j < colonne.length; j++) {
        if (dati[i][colonne[j]] == null) {
          righe += "<td>-</td>";
        } else {
          righe += "<td>" + dati[i][colonne[j]] + "</td>";
        }
      }
      righe += "</tr>";
    }
    document.getElementById("tabella-dati").innerHTML = righe;

    document.getElementById("stato").innerHTML = "Dati caricati correttamente.";
  }
};

richiesta.send();
