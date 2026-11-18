/* A self-contained, curated answer deck. Rarity reflects game difficulty,
   not survey statistics. Pipes separate accepted aliases; no network is needed.
   Paris 2024 disciplines checked against the IOC Olympic Studies Centre's
   'Sports Pictograms ... Tokyo 1964 to Paris 2024'. */
(() => {
  'use strict';
  const tiers = {
    common: { id: 'common', name: 'Surface', label: 'Common / Surface', points: 10 },
    uncommon: { id: 'uncommon', name: 'Uncommon', label: 'Uncommon', points: 30 },
    niche: { id: 'niche', name: 'Niche', label: 'Niche', points: 60 },
    ultra: { id: 'ultra', name: 'One in a Krillion', label: 'Ultra-Rare / One in a Krillion', points: 100 }
  };
  function prompt(id, category, title, hint, groups) {
    return {
      id, category, title, hint,
      answers: Object.entries(groups).flatMap(([tier, entries]) => entries.map(entry => {
        const [name, ...aliases] = entry.split('|');
        return { name, aliases, tier, points: tiers[tier].points };
      }))
    };
  }
  const prompts = [
    prompt('red-white-flags', 'Geography', 'Name a country with a red and white flag.',
      'Only red and white; dark red and maroon count. Use the plain national flag.', {
      common: ['Japan', 'Canada', 'Poland', 'Switzerland'],
      uncommon: ['Denmark', 'Austria', 'Indonesia', 'Turkey|Türkiye|Turkiye'],
      niche: ['Monaco', 'Peru', 'Singapore', 'Tunisia'],
      ultra: ['Bahrain', 'Tonga', 'Georgia', 'Latvia', 'Qatar']
    }),
    prompt('beef-cuts', 'Food & drink', 'Name a cut of beef.',
      'A steak, roast, or butcher’s cut. Regional names are welcome.', {
      common: ['Ribeye|Rib eye|Rib-eye steak', 'Sirloin|Sirloin steak', 'Brisket', 'Tenderloin|Filet mignon|Fillet steak|Beef fillet'],
      uncommon: ['T-bone|T bone|T-bone steak', 'Porterhouse|Porterhouse steak', 'Flank|Flank steak', 'Chuck|Chuck steak|Chuck roast', 'Short ribs|Beef short ribs', 'Rump|Rump steak|Rump roast'],
      niche: ['Skirt|Skirt steak', 'Tri-tip|Tri tip|Triangle roast', 'Flat iron|Flat iron steak', 'Hanger|Hanger steak|Hanging tender|Onglet', 'Shank|Beef shank', 'Oxtail|Ox tail', 'Top round|Topside', 'Strip steak|New York strip|Striploin|Strip loin'],
      ultra: ['Bavette|Bavette steak|Flap steak|Sirloin flap', 'Denver steak|Denver', 'Teres major|Petite tender|Shoulder tender', 'Picanha|Rump cap|Sirloin cap|Coulotte', 'Spider steak|Oyster steak', 'Merlot steak|Merlot', 'Chuck eye|Chuck eye steak', 'Eye of round|Eye round', 'Bottom round|Silverside']
    }),
    prompt('sports-cars', 'On the road', 'Name a sports car model.',
      'Name a specific model, past or present — the manufacturer alone won’t count.', {
      common: ['Porsche 911|911', 'Chevrolet Corvette|Corvette|Chevy Corvette', 'Mazda MX-5|MX-5|MX5|Miata|Mazda Miata|Mazda MX5', 'Ferrari F40|F40', 'Lamborghini Huracán|Huracan|Lamborghini Huracan'],
      uncommon: ['Toyota Supra|Supra|GR Supra', 'Nissan GT-R|GTR|GT-R|Nissan GTR', 'Audi R8|R8', 'BMW Z4|Z4', 'Honda NSX|Acura NSX|NSX', 'Ford GT', 'Ford GT40|GT40', 'Jaguar F-Type|F-Type|F Type'],
      niche: ['Lotus Elise|Elise', 'Alpine A110|A110', 'Honda S2000|S2000', 'Porsche Cayman|Cayman|718 Cayman', 'Mazda RX-7|RX7|RX-7', 'Toyota MR2|MR2', 'Subaru BRZ|BRZ', 'Toyota GT86|GT86|Toyota 86', 'Toyota GR86|GR86|Toyota GR 86', 'McLaren 720S|720S'],
      ultra: ['TVR Sagaris|Sagaris', 'Ginetta G40|G40', 'Noble M600|M600', 'Wiesmann MF5|MF5', 'Ariel Atom|Atom', 'Caterham Seven|Caterham 7|Seven', 'BAC Mono|Mono', 'Donkervoort D8|D8', 'Morgan Plus Six|Plus Six', 'Spyker C8|C8 Spyder|Spyker C8 Spyder', 'Pagani Zonda|Zonda', 'Koenigsegg Agera|Agera']
    }),
    prompt('olympic-sports', 'Sport', 'Name a sport from the Paris 2024 Olympics.',
      'Summer Games only. Sports and their named Olympic disciplines both count.', {
      common: ['Swimming', 'Athletics|Track and field|Track & field', 'Basketball', 'Football|Soccer', 'Gymnastics|Artistic gymnastics', 'Tennis'],
      uncommon: ['Volleyball|Indoor volleyball', 'Boxing', 'Cycling|Road cycling|Cycling road', 'Golf', 'Diving', 'Wrestling|Freestyle wrestling|Greco-Roman wrestling', 'Rugby sevens|Rugby 7s|Rugby', 'Table tennis|Ping pong', 'Beach volleyball', 'Shooting|Sport shooting', 'Aquatics|Aquatic sports'],
      niche: ['Fencing', 'Rowing', 'Judo', 'Badminton', 'Archery', 'Sailing', 'Handball', 'Water polo', 'Hockey|Field hockey', 'Weightlifting', 'Taekwondo', 'Equestrian|Horse riding', 'Triathlon', 'Skateboarding', 'Surfing', 'Sport climbing|Climbing|Rock climbing'],
      ultra: ['Breaking|Breakdancing|Break dancing', 'Modern pentathlon|Pentathlon', 'Artistic swimming|Synchronized swimming|Synchronised swimming', 'Trampoline|Trampolining|Trampoline gymnastics', 'Rhythmic gymnastics', 'Canoe slalom|Slalom canoeing', 'Canoe sprint|Sprint canoeing|Canoeing|Kayaking', 'BMX freestyle|Freestyle BMX', 'BMX racing|BMX race|BMX', 'Mountain biking|Mountain bike', 'Track cycling|Cycling track', 'Marathon swimming|Open water swimming', '3x3 basketball|Three on three basketball', 'Dressage', 'Eventing', 'Equestrian jumping|Show jumping']
    }),
    prompt('scientists', 'Science', 'Name a scientist from history.',
      'Natural scientists, mathematicians, and pioneering computer scientists count.', {
      common: ['Albert Einstein|Einstein', 'Isaac Newton|Newton', 'Marie Curie|Curie|Maria Sklodowska Curie', 'Charles Darwin|Darwin', 'Galileo Galilei|Galileo', 'Stephen Hawking|Hawking'],
      uncommon: ['Nikola Tesla|Tesla', 'Louis Pasteur|Pasteur', 'Alan Turing|Turing', 'Ada Lovelace|Lovelace', 'Rosalind Franklin|Franklin', 'Dmitri Mendeleev|Mendeleev', 'Gregor Mendel|Mendel', 'Alexander Fleming|Fleming', 'Richard Feynman|Feynman'],
      niche: ['Niels Bohr|Bohr', 'Michael Faraday|Faraday', 'James Clerk Maxwell|Maxwell', 'Katherine Johnson|Johnson', 'Rachel Carson|Carson', 'Carl Sagan|Sagan', 'Johannes Kepler|Kepler', 'Lise Meitner|Meitner', 'Srinivasa Ramanujan|Ramanujan', 'Grace Hopper|Hopper', 'Antoine Lavoisier|Lavoisier', 'Nicolaus Copernicus|Copernicus'],
      ultra: ['Chien-Shiung Wu|Chien Shiung Wu|Wu', 'Emmy Noether|Noether', 'Satyendra Nath Bose|Satyendra Bose|Bose', 'Mary Anning|Anning', 'Ibn al-Haytham|Ibn al Haytham|Alhazen', 'Subrahmanyan Chandrasekhar|Chandrasekhar', 'Cecilia Payne-Gaposchkin|Cecilia Payne|Payne Gaposchkin', 'Alice Ball', 'Émilie du Châtelet|Emilie du Chatelet|Du Chatelet', 'Dorothy Hodgkin|Hodgkin', 'Barbara McClintock|McClintock', 'Henrietta Swan Leavitt|Henrietta Leavitt|Leavitt', 'Abdus Salam|Salam', 'Jagadish Chandra Bose|J C Bose', 'Tu Youyou|Youyou Tu', 'Percy Julian|Julian']
    }),
    prompt('arcade-games', 'Player one', 'Name a classic arcade video game.',
      'A game released in arcades before 1990. The cabinet days.', {
      common: ['Pac-Man|Pacman|Pac Man', 'Space Invaders', 'Donkey Kong', 'Pong', 'Street Fighter|Street Fighter 1'],
      uncommon: ['Galaga', 'Asteroids', 'Frogger', 'Centipede', 'Ms. Pac-Man|Ms Pacman|Miss Pac Man', 'Tetris', 'Out Run|OutRun', 'Double Dragon'],
      niche: ['Defender', 'Joust', 'Q*bert|Qbert|Q Bert', 'Dig Dug', 'Rampage', 'Gauntlet', 'Bubble Bobble', '1942', 'Arkanoid', 'Golden Axe', 'After Burner|Afterburner', 'Ghosts ’n Goblins|Ghosts and Goblins|Ghosts n Goblins'],
      ultra: ['Tempest', 'Robotron: 2084|Robotron 2084|Robotron', 'Marble Madness', 'Sinistar', 'Berzerk', 'Mappy', 'Gyruss', 'Paperboy', 'Moon Patrol', 'Burgertime|Burger Time', 'Battlezone', 'Xevious', 'Zaxxon', 'Spy Hunter', 'Track & Field|Track and Field']
    }),
    prompt('pasta-shapes', 'Food & drink', 'Name a shape of pasta.',
      'Italian pasta shapes, including filled pasta. Sauces don’t count.', {
      common: ['Spaghetti', 'Penne', 'Macaroni|Elbow macaroni', 'Fusilli|Spiral pasta', 'Lasagne|Lasagna'],
      uncommon: ['Farfalle|Bow tie pasta|Bowtie pasta', 'Rigatoni', 'Linguine|Linguini', 'Fettuccine|Fettucine', 'Ravioli', 'Tortellini', 'Tagliatelle'],
      niche: ['Bucatini', 'Orecchiette', 'Orzo|Risoni', 'Conchiglie|Shell pasta', 'Cannelloni', 'Pappardelle', 'Cavatappi', 'Ditalini', 'Rotini', 'Ziti', 'Capellini|Angel hair|Angel hair pasta'],
      ultra: ['Strozzapreti', 'Mafaldine|Reginette', 'Garganelli', 'Trofie', 'Campanelle|Gigli', 'Cavatelli', 'Paccheri', 'Radiatori', 'Fregola|Fregula', 'Malloreddus', 'Casarecce', 'Pici', 'Agnolotti', 'Anellini']
    }),
    prompt('greek-alphabet', 'Word world', 'Name a letter of the Greek alphabet.',
      'Use the English name of any of the 24 modern Greek letters.', {
      common: ['Alpha', 'Beta', 'Gamma', 'Delta'],
      uncommon: ['Omega', 'Pi', 'Sigma', 'Theta', 'Lambda'],
      niche: ['Epsilon', 'Zeta', 'Eta', 'Iota', 'Kappa', 'Mu', 'Nu', 'Phi', 'Psi'],
      ultra: ['Xi', 'Omicron', 'Rho', 'Tau', 'Upsilon', 'Chi']
    }),
    prompt('chemical-elements', 'Science', 'Name a chemical element.',
      'Any of the 118 elements. Use its name or chemical symbol.', {
      common: ['Hydrogen|H', 'Oxygen|O', 'Carbon|C', 'Gold|Au', 'Silver|Ag', 'Iron|Fe', 'Helium|He', 'Copper|Cu'],
      uncommon: ['Nitrogen|N', 'Sodium|Na', 'Calcium|Ca', 'Aluminium|Aluminum|Al', 'Chlorine|Cl', 'Neon|Ne', 'Silicon|Si', 'Uranium|U', 'Mercury|Hg', 'Lead|Pb', 'Zinc|Zn', 'Tin|Sn', 'Lithium|Li', 'Magnesium|Mg', 'Potassium|K', 'Sulfur|Sulphur|S', 'Phosphorus|P', 'Nickel|Ni', 'Platinum|Pt', 'Fluorine|F'],
      niche: ['Beryllium|Be', 'Boron|B', 'Argon|Ar', 'Scandium|Sc', 'Titanium|Ti', 'Vanadium|V', 'Chromium|Cr', 'Manganese|Mn', 'Cobalt|Co', 'Gallium|Ga', 'Germanium|Ge', 'Arsenic|As', 'Selenium|Se', 'Bromine|Br', 'Krypton|Kr', 'Rubidium|Rb', 'Strontium|Sr', 'Zirconium|Zr', 'Molybdenum|Mo', 'Palladium|Pd', 'Cadmium|Cd', 'Iodine|I', 'Xenon|Xe', 'Caesium|Cesium|Cs', 'Barium|Ba', 'Tungsten|W|Wolfram', 'Osmium|Os', 'Iridium|Ir', 'Bismuth|Bi', 'Radon|Rn', 'Radium|Ra', 'Plutonium|Pu', 'Neptunium|Np', 'Americium|Am', 'Thorium|Th', 'Polonium|Po'],
      ultra: ['Yttrium|Y', 'Niobium|Nb', 'Technetium|Tc', 'Ruthenium|Ru', 'Rhodium|Rh', 'Indium|In', 'Antimony|Sb', 'Tellurium|Te', 'Lanthanum|La', 'Cerium|Ce', 'Praseodymium|Pr', 'Neodymium|Nd', 'Promethium|Pm', 'Samarium|Sm', 'Europium|Eu', 'Gadolinium|Gd', 'Terbium|Tb', 'Dysprosium|Dy', 'Holmium|Ho', 'Erbium|Er', 'Thulium|Tm', 'Ytterbium|Yb', 'Lutetium|Lu', 'Hafnium|Hf', 'Tantalum|Ta', 'Rhenium|Re', 'Thallium|Tl', 'Astatine|At', 'Francium|Fr', 'Actinium|Ac', 'Protactinium|Pa', 'Curium|Cm', 'Berkelium|Bk', 'Californium|Cf', 'Einsteinium|Es', 'Fermium|Fm', 'Mendelevium|Md', 'Nobelium|No', 'Lawrencium|Lr', 'Rutherfordium|Rf', 'Dubnium|Db', 'Seaborgium|Sg', 'Bohrium|Bh', 'Hassium|Hs', 'Meitnerium|Mt', 'Darmstadtium|Ds', 'Roentgenium|Rg', 'Copernicium|Cn', 'Nihonium|Nh', 'Flerovium|Fl', 'Moscovium|Mc', 'Livermorium|Lv', 'Tennessine|Ts', 'Oganesson|Og']
    }),
    prompt('musical-instruments', 'Music', 'Name a musical instrument.',
      'Acoustic and electronic instruments both count.', {
      common: ['Piano', 'Guitar', 'Violin', 'Drums|Drum kit|Drum set', 'Flute', 'Trumpet'],
      uncommon: ['Saxophone|Sax', 'Cello|Violoncello', 'Clarinet', 'Harp', 'Trombone', 'Ukulele|Ukelele', 'Accordion', 'Banjo', 'Keyboard|Electric keyboard', 'Recorder', 'Bass guitar|Electric bass'],
      niche: ['Oboe', 'Bassoon', 'Viola', 'Double bass|Upright bass|Contrabass', 'Mandolin', 'Harmonica', 'Xylophone', 'Marimba', 'Tuba', 'French horn|Horn', 'Sitar', 'Bagpipes|Bagpipe', 'Synthesizer|Synthesiser|Synth', 'Djembe', 'Cajón|Cajon', 'Dulcimer'],
      ultra: ['Theremin', 'Ondes Martenot', 'Nyckelharpa', 'Hurdy-gurdy|Hurdy gurdy', 'Glass harmonica|Armonica', 'Hang|Handpan', 'Kora', 'Mbira|Thumb piano', 'Kalimba', 'Shakuhachi', 'Erhu', 'Guzheng', 'Duduk', 'Balalaika', 'Contrabassoon', 'Waterphone']
    }),
    prompt('ocean-animals', 'Ocean life', 'Name an animal that lives in the ocean.',
      'A familiar animal or a specific species. Freshwater-only animals don’t count.', {
      common: ['Shark', 'Dolphin', 'Whale', 'Octopus', 'Jellyfish', 'Crab', 'Sea turtle|Turtle|Marine turtle', 'Fish'],
      uncommon: ['Seahorse|Sea horse', 'Starfish|Sea star', 'Lobster', 'Squid', 'Seal', 'Stingray|Sting ray', 'Clownfish|Clown fish', 'Orca|Killer whale', 'Shrimp', 'Prawn', 'Krill', 'Penguin', 'Sea lion', 'Walrus'],
      niche: ['Manta ray|Manta', 'Moray eel|Moray|Eel', 'Cuttlefish', 'Nautilus', 'Sea cucumber', 'Sea urchin', 'Anglerfish|Angler fish', 'Swordfish|Sword fish', 'Narwhal', 'Beluga|Beluga whale', 'Blue whale', 'Humpback whale', 'Hammerhead shark|Hammerhead', 'Whale shark', 'Great white shark|Great white', 'Tuna', 'Coral', 'Sea anemone|Anemone', 'Sea otter', 'Horseshoe crab'],
      ultra: ['Dumbo octopus', 'Vampire squid', 'Giant isopod', 'Barreleye|Barreleye fish', 'Goblin shark', 'Frilled shark', 'Gulper eel|Pelican eel', 'Leafy seadragon|Leafy sea dragon|Seadragon', 'Nudibranch|Sea slug', 'Siphonophore', 'Yeti crab', 'Bobbit worm', 'Coelacanth', 'Oarfish|Oar fish', 'Mantis shrimp', 'Blue dragon|Glaucus atlanticus', 'Christmas tree worm', 'Sea pig', 'Glass sponge']
    }),
    prompt('shakespeare-plays', 'Books & stage', 'Name a play by William Shakespeare.',
      'Tragedies, comedies, and histories all count. Poems don’t.', {
      common: ['Hamlet', 'Romeo and Juliet|Romeo & Juliet', 'Macbeth', 'Othello', 'A Midsummer Night’s Dream|A Midsummer Nights Dream|Midsummer Nights Dream'],
      uncommon: ['King Lear', 'The Tempest|Tempest', 'Twelfth Night', 'The Merchant of Venice|Merchant of Venice', 'Much Ado About Nothing', 'Julius Caesar'],
      niche: ['As You Like It', 'The Taming of the Shrew|Taming of the Shrew', 'Richard III|Richard 3|Richard the Third', 'Richard II|Richard 2|Richard the Second', 'Henry V|Henry 5|Henry the Fifth', 'The Winter’s Tale|The Winters Tale|Winters Tale', 'Antony and Cleopatra|Antony & Cleopatra', 'Coriolanus', 'Measure for Measure', 'The Comedy of Errors|Comedy of Errors'],
      ultra: ['Titus Andronicus', 'Timon of Athens', 'Troilus and Cressida', 'Love’s Labour’s Lost|Loves Labours Lost|Loves Labors Lost|Loves Labour Lost', 'The Two Gentlemen of Verona|Two Gentlemen of Verona', 'The Merry Wives of Windsor|Merry Wives of Windsor', 'All’s Well That Ends Well|Alls Well That Ends Well', 'Pericles|Pericles Prince of Tyre', 'Cymbeline', 'King John', 'Henry IV, Part 1|Henry IV Part One|Henry 4 Part 1|1 Henry IV', 'Henry IV, Part 2|Henry IV Part Two|Henry 4 Part 2|2 Henry IV', 'Henry VI, Part 1|Henry VI Part One|Henry 6 Part 1|1 Henry VI', 'Henry VI, Part 2|Henry VI Part Two|Henry 6 Part 2|2 Henry VI', 'Henry VI, Part 3|Henry VI Part Three|Henry 6 Part 3|3 Henry VI', 'Henry VIII|Henry 8|Henry the Eighth', 'The Two Noble Kinsmen|Two Noble Kinsmen']
    }),
    prompt('capital-cities', 'Geography', 'Name a national capital city in Europe.',
      'Capitals geographically in Europe. National capitals only — not regional capitals.', {
      common: ['London', 'Paris', 'Rome', 'Berlin', 'Madrid'],
      uncommon: ['Lisbon', 'Vienna', 'Athens', 'Amsterdam', 'Dublin', 'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki', 'Brussels', 'Prague', 'Warsaw', 'Budapest'],
      niche: ['Reykjavík|Reykjavik', 'Tallinn', 'Riga', 'Vilnius', 'Bratislava', 'Ljubljana', 'Zagreb', 'Belgrade', 'Bucharest', 'Sofia', 'Kyiv|Kiev', 'Bern|Berne', 'Luxembourg|Luxembourg City', 'Moscow', 'Minsk'],
      ultra: ['Podgorica', 'Skopje', 'Tirana', 'Sarajevo', 'Chişinău|Chisinau|Kishinev', 'Valletta', 'Vaduz', 'Andorra la Vella', 'San Marino', 'Vatican City|Vatican', 'Monaco']
    }),
    prompt('gemstones', 'Hidden treasures', 'Name a gemstone.',
      'Precious and semiprecious gems, including organic gems such as pearls.', {
      common: ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl'],
      uncommon: ['Amethyst', 'Opal', 'Topaz', 'Garnet', 'Jade', 'Turquoise', 'Aquamarine', 'Quartz|Rock crystal', 'Amber'],
      niche: ['Peridot', 'Tanzanite', 'Lapis lazuli|Lapis', 'Moonstone', 'Citrine', 'Onyx', 'Tourmaline', 'Alexandrite', 'Zircon', 'Agate', 'Jasper', 'Malachite', 'Spinel', 'Rose quartz', 'Bloodstone'],
      ultra: ['Benitoite', 'Taaffeite', 'Grandidierite', 'Painite', 'Demantoid', 'Tsavorite', 'Kunzite', 'Morganite', 'Iolite', 'Labradorite', 'Larimar', 'Chrysoberyl', 'Sphene|Titanite', 'Sunstone', 'Chalcedony']
    }),
    prompt('tree-types', 'The natural world', 'Name a type of tree.',
      'A common tree name or a specific species. Fruit trees count too.', {
      common: ['Oak', 'Pine', 'Maple', 'Palm|Palm tree', 'Willow', 'Birch'],
      uncommon: ['Elm', 'Ash', 'Beech', 'Cedar', 'Spruce', 'Fir', 'Redwood', 'Sequoia', 'Cherry|Cherry tree', 'Apple|Apple tree', 'Olive|Olive tree', 'Coconut|Coconut palm'],
      niche: ['Sycamore', 'Cypress', 'Walnut', 'Chestnut', 'Poplar', 'Aspen', 'Magnolia', 'Eucalyptus|Gum tree', 'Acacia', 'Baobab', 'Ginkgo|Gingko', 'Yew', 'Holly', 'Alder', 'Larch', 'Hawthorn', 'Rowan|Mountain ash'],
      ultra: ['Wollemi pine', 'Monkey puzzle|Monkey puzzle tree|Araucaria araucana', 'Bristlecone pine', 'Dawn redwood', 'Tulip tree|Tulip poplar', 'Jacaranda', 'Katsura', 'Zelkova', 'Tamarack', 'Ironwood', 'Sassafras', 'Sweetgum|Sweet gum', 'Paulownia|Empress tree', 'Dragon blood tree|Dragons blood tree']
    }),
    prompt('cheeses', 'Food & drink', 'Name a type of cheese.',
      'A cheese variety, not a brand. Regional spellings are accepted.', {
      common: ['Cheddar', 'Mozzarella', 'Parmesan|Parmigiano Reggiano|Parmigiano', 'Brie', 'Feta', 'Cream cheese'],
      uncommon: ['Gouda', 'Camembert', 'Swiss|Swiss cheese|Emmental|Emmentaler', 'Ricotta', 'Halloumi|Haloumi', 'Blue cheese|Bleu cheese', 'Cottage cheese', 'Provolone', 'Monterey Jack|Monterey', 'Paneer'],
      niche: ['Gruyère|Gruyere', 'Manchego', 'Gorgonzola', 'Roquefort', 'Stilton', 'Burrata', 'Mascarpone', 'Pecorino|Pecorino Romano', 'Edam', 'Havarti', 'Muenster', 'Munster', 'Fontina', 'Gjetost|Brunost', 'Queso fresco', 'Oaxaca|Queso Oaxaca'],
      ultra: ['Époisses|Epoisses', 'Mimolette', 'Taleggio', 'Comté|Comte', 'Reblochon', 'Morbier', 'Cabrales', 'Ossau-Iraty|Ossau Iraty', 'Caciocavallo', 'Banon', 'Valençay|Valencay', 'Stinking Bishop', 'Crottin de Chavignol|Crottin', 'Tête de Moine|Tete de Moine']
    }),
    prompt('dinosaurs', 'Prehistoric world', 'Name a dinosaur.',
      'Use a dinosaur genus. Flying pterosaurs and marine reptiles aren’t dinosaurs.', {
      common: ['Tyrannosaurus|Tyrannosaurus rex|T rex|T-rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Brachiosaurus', 'Brontosaurus'],
      uncommon: ['Diplodocus', 'Spinosaurus', 'Allosaurus', 'Ankylosaurus', 'Apatosaurus', 'Iguanodon', 'Parasaurolophus', 'Pachycephalosaurus'],
      niche: ['Carnotaurus', 'Deinonychus', 'Compsognathus', 'Dilophosaurus', 'Gallimimus', 'Oviraptor', 'Giganotosaurus', 'Argentinosaurus', 'Therizinosaurus', 'Styracosaurus', 'Protoceratops', 'Maiasaura', 'Coelophysis'],
      ultra: ['Microraptor', 'Amargasaurus', 'Concavenator', 'Nigersaurus', 'Yi|Yi qi', 'Deinocheirus', 'Mononykus', 'Ouranosaurus', 'Sauropelta', 'Kentrosaurus', 'Psittacosaurus', 'Cryolophosaurus', 'Fukuiraptor', 'Baryonyx', 'Minmi', 'Australovenator', 'Dreadnoughtus', 'Euoplocephalus']
    }),
    prompt('board-games', 'Game night', 'Name a board game.',
      'Tabletop games played with a board or tiles. Card-only games don’t count.', {
      common: ['Chess', 'Monopoly', 'Scrabble', 'Clue|Cluedo', 'Checkers|Draughts', 'Risk'],
      uncommon: ['Catan|Settlers of Catan|The Settlers of Catan', 'Ticket to Ride', 'Battleship', 'Backgammon', 'Go', 'Othello|Reversi', 'Trivial Pursuit', 'Sorry|Sorry!', 'Candy Land|Candyland', 'Snakes and Ladders|Chutes and Ladders'],
      niche: ['Carcassonne', 'Pandemic', 'Azul', 'Wingspan', 'Splendor', 'Stratego', 'Sequence', 'The Game of Life|Game of Life|Life', 'Mancala', 'Chinese Checkers', 'Mahjong|Mah jong|Mahjongg', 'Boggle', 'Blokus', 'Kingdomino'],
      ultra: ['Agricola', 'Terra Mystica', 'Twilight Imperium', 'Gloomhaven', 'Scythe', 'Root', 'Brass: Birmingham|Brass Birmingham', 'Everdell', 'Viticulture', 'Concordia', 'Castles of Burgundy|The Castles of Burgundy', 'Tzolk’in|Tzolkin', 'Hansa Teutonica', 'Great Western Trail', 'Spirit Island', 'Power Grid', 'Through the Desert']
    }),
    prompt('fruit', 'The natural world', 'Name a fruit.',
      'Culinary fruits, including berries and tropical fruits. Fresh or dried.', {
      common: ['Apple', 'Banana', 'Orange', 'Grape|Grapes', 'Strawberry|Strawberries', 'Watermelon'],
      uncommon: ['Pear', 'Peach', 'Plum', 'Pineapple', 'Mango', 'Lemon', 'Lime', 'Cherry|Cherries', 'Blueberry|Blueberries', 'Raspberry|Raspberries', 'Kiwi|Kiwifruit|Kiwi fruit', 'Coconut', 'Grapefruit', 'Melon'],
      niche: ['Pomegranate', 'Apricot', 'Nectarine', 'Fig', 'Date|Dates', 'Passion fruit|Passionfruit', 'Dragon fruit|Dragonfruit|Pitaya', 'Lychee|Litchi', 'Guava', 'Papaya|Pawpaw', 'Blackberry|Blackberries', 'Cranberry|Cranberries', 'Cantaloupe', 'Persimmon', 'Tangerine', 'Mandarin|Mandarin orange'],
      ultra: ['Rambutan', 'Mangosteen', 'Salak|Snake fruit', 'Jabuticaba', 'Cherimoya|Custard apple', 'Soursop|Guanabana', 'Feijoa|Pineapple guava', 'Loquat', 'Quince', 'Medlar', 'Kumquat', 'Star fruit|Starfruit|Carambola', 'Jackfruit', 'Durian', 'Longan', 'Breadfruit', 'Ugli fruit|Ugli', 'Physalis|Cape gooseberry|Goldenberry', 'Cloudberry', 'Mulberry']
    }),
    prompt('languages', 'Word world', 'Name a living language.',
      'Spoken or signed human languages. Programming languages don’t count.', {
      common: ['English', 'Spanish|Castilian', 'French', 'German', 'Chinese|Mandarin|Mandarin Chinese', 'Japanese', 'Italian'],
      uncommon: ['Portuguese', 'Russian', 'Arabic', 'Hindi', 'Korean', 'Dutch', 'Greek', 'Turkish', 'Swedish', 'Polish', 'Vietnamese', 'Thai', 'Bengali|Bangla', 'Urdu', 'Indonesian|Bahasa Indonesia', 'Norwegian', 'Danish', 'Finnish'],
      niche: ['Swahili|Kiswahili', 'Hebrew', 'Persian|Farsi', 'Tamil', 'Telugu', 'Punjabi|Panjabi', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Welsh|Cymraeg', 'Irish|Irish Gaelic|Gaeilge', 'Icelandic', 'Hungarian', 'Romanian', 'Czech', 'Ukrainian', 'Tagalog|Filipino', 'Malay|Bahasa Melayu', 'Zulu|IsiZulu', 'Afrikaans', 'Amharic', 'Nepali', 'Khmer', 'Lao', 'American Sign Language|ASL', 'British Sign Language|BSL', 'Catalan'],
      ultra: ['Basque|Euskara', 'Xhosa|IsiXhosa', 'Georgian', 'Armenian', 'Māori|Maori|Te Reo Maori', 'Navajo|Dine Bizaad', 'Inuktitut', 'Quechua', 'Aymara', 'Guaraní|Guarani', 'Dzongkha', 'Tibetan', 'Maltese', 'Breton', 'Occitan', 'Sámi|Sami|Northern Sami', 'Faroese', 'Luxembourgish', 'Haitian Creole', 'Yoruba', 'Igbo', 'Hausa', 'Wolof', 'Malagasy', 'Sundanese', 'Javanese', 'Esperanto', 'Scottish Gaelic|Gàidhlig', 'Manx', 'Cornish']
    })
  ];
  window.KRILLION_DATA = { tiers, prompts };
})();
