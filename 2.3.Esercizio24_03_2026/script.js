document.getElementById("fileInput").addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const text = e.target.result;
    const righe = text.split("\n").filter(r => r.trim() !== "");

    const intestazioni = righe[0].split(",");
    const dati = righe.slice(1);

    // pulisco il contenitore
    document.getElementById("container").innerHTML = "";

    creaBlocchiRicorsivo(dati, intestazioni, 0);
  };

  reader.readAsText(file);
});

function creaBlocchiRicorsivo(dati, intestazioni, indice) {
  if (indice >= dati.length) return;

  const container = document.getElementById("container");

  const valori = dati[indice].split(",");
  const card = document.createElement("div");
  card.className = "card";

  intestazioni.forEach((campo, i) => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${campo}:</strong> ${valori[i] || ""}`;
    card.appendChild(p);
  });

  container.appendChild(card);

  // ricorsione
  creaBlocchiRicorsivo(dati, intestazioni, indice + 1);
}