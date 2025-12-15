export const seedData = {
  "metadata": {
    "title": "Baza Wiedzy o Endecji (Narodowej Demokracji)",
    "description": "Kompleksowa baza wiedzy dla edukacyjnej aplikacji demitologizującej propagandę sowiecką o Endecji",
    "version": "1.0",
    "nodes_count": 67,
    "edges_count": 110
  },
  "nodes": [
    {
      "id": "dmowski_roman",
      "label": "Roman Dmowski",
      "type": "person",
      "dates": "1864-1939",
      "description": "Założyciel i główny ideolog Endecji...",
      "importance": 1.0
    },
    {
      "id": "poplawski_jan",
      "label": "Jan Ludwik Popławski",
      "type": "person",
      "dates": "1854-1908",
      "importance": 0.9
    },
    {
      "id": "balicki_zygmunt",
      "label": "Zygmunt Balicki",
      "type": "person",
      "dates": "1858-1916",
      "importance": 0.85
    },
    {
      "id": "grabski_wladyslaw",
      "label": "Władysław Grabski",
      "type": "person",
      "dates": "1874-1938",
      "importance": 0.75
    },
    {
      "id": "grabski_stanislaw",
      "label": "Stanisław Grabski",
      "type": "person",
      "dates": "1871-1949",
      "importance": 0.7
    },
    {
      "id": "mosdorf_jan",
      "label": "Jan Mosdorf",
      "type": "person",
      "dates": "1904-1943",
      "importance": 0.65
    },
    {
      "id": "rybarski_roman",
      "label": "Roman Rybarski",
      "type": "person",
      "dates": "1887-1942",
      "importance": 0.7
    },
    {
      "id": "pilsudski_jozef",
      "label": "Józef Piłsudski",
      "type": "person",
      "dates": "1867-1935",
      "importance": 0.95,
      "rival": true
    },
    {
      "id": "wasilewski_leon",
      "label": "Leon Wasilewski",
      "type": "person",
      "dates": "1870-1936",
      "importance": 0.6
    },
    {
      "id": "liga_narodowa",
      "label": "Liga Narodowa",
      "type": "organization",
      "dates": "1893-1928",
      "importance": 1.0
    },
    {
      "id": "snd",
      "label": "Stronnictwo Narodowo-Demokratyczne",
      "type": "organization",
      "dates": "1897-1919",
      "importance": 0.9
    },
    {
      "id": "komitet_narodowy",
      "label": "Komitet Narodowy Polski",
      "type": "organization",
      "dates": "1917-1919",
      "importance": 0.95
    },
    {
      "id": "stronnictwo_narodowe",
      "label": "Stronnictwo Narodowe",
      "type": "organization",
      "dates": "1928-1939",
      "importance": 0.85
    },
    {
      "id": "owp",
      "label": "Obóz Wielkiej Polski",
      "type": "organization",
      "dates": "1926-1933",
      "importance": 0.8
    },
    {
      "id": "mlodziez_wszechpolska",
      "label": "Młodzież Wszechpolska",
      "type": "organization",
      "dates": "1922-1939",
      "importance": 0.75
    },
    {
      "id": "onr",
      "label": "Obóz Narodowo-Radykalny",
      "type": "organization",
      "dates": "1934-1939",
      "importance": 0.65
    },
    {
      "id": "egoizm_narodowy_concept",
      "label": "Egoizm Narodowy",
      "type": "concept",
      "importance": 0.9
    },
    {
      "id": "koncepcja_piastowska",
      "label": "Koncepcja Piastowska",
      "type": "concept",
      "importance": 0.85
    },
    {
      "id": "swiadomosc_narodowa",
      "label": "Świadomość Narodowa",
      "type": "concept",
      "importance": 0.8
    },
    {
      "id": "mysli_polaka",
      "label": "Myśli nowoczesnego Polaka",
      "type": "publication",
      "dates": "1903",
      "importance": 1.0
    },
    {
        "id": "konferencja_paryska",
        "label": "Konferencja Pokojowa w Paryżu",
        "type": "event",
        "dates": "1919",
        "importance": 1.0
    },
    {
        "id": "zalozenie_ligi",
        "label": "Założenie Ligi Narodowej",
        "type": "event",
        "dates": "1893",
        "importance": 1.0
    }
  ],
  "edges": [
    { "source": "dmowski_roman", "target": "liga_narodowa", "relationship": "założył", "dates": "1893" },
    { "source": "poplawski_jan", "target": "liga_narodowa", "relationship": "współzałożył", "dates": "1893" },
    { "source": "balicki_zygmunt", "target": "liga_narodowa", "relationship": "współzałożył", "dates": "1893" },
    { "source": "dmowski_roman", "target": "pilsudski_jozef", "relationship": "rywalizował", "dates": "1900-1935" },
    { "source": "dmowski_roman", "target": "mysli_polaka", "relationship": "napisał", "dates": "1903" },
    { "source": "dmowski_roman", "target": "egoizm_narodowy_concept", "relationship": "propagował" },
    { "source": "balicki_zygmunt", "target": "egoizm_narodowy_concept", "relationship": "sformułował teorię" },
    { "source": "liga_narodowa", "target": "snd", "relationship": "przekształciła się", "dates": "1897" },
    { "source": "snd", "target": "stronnictwo_narodowe", "relationship": "zreformowała się", "dates": "1928" },
    { "source": "dmowski_roman", "target": "komitet_narodowy", "relationship": "kierował", "dates": "1917-1919" },
    { "source": "dmowski_roman", "target": "owp", "relationship": "założył", "dates": "1926" },
    { "source": "mosdorf_jan", "target": "mlodziez_wszechpolska", "relationship": "kierował" },
    { "source": "onr", "target": "stronnictwo_narodowe", "relationship": "odłączył się od", "dates": "1934" },
    { "source": "mlodziez_wszechpolska", "target": "owp", "relationship": "organ na uczelniach" },
    { "source": "dmowski_roman", "target": "konferencja_paryska", "relationship": "reprezentował Polskę", "dates": "1919" }
  ]
};