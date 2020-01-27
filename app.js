const config = require("config");
const mongoose = require("mongoose");
const City = require("./models/City");

const VK = require("vk-io").VK;

let result = {
  cities: 0
};

const mongoConnection = async () => {
  try {
    await mongoose.connect(config.get("mongoUri"), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    });
  } catch (error) {
    console.log(`Server error: ${error.message}`);
    process.exit(1);
  }
};

const loadData = async obj => {
  switch (obj.type) {
    case "cities":
      const { countryId } = obj;
      for (const item of obj.arr) {
        try {
          const { id, title } = item;

          const query = await City.findOne({ vkId: id });

          if (query) {
            continue;
          }

          const city = new City({
            vkId: id,
            countryId,
            title
          });

          await city.save();
          result.cities++;
        } catch (error) {
          console.log(`Ошибка: ${error.toString()}`);
        }
      }
      break;
    default:
      break;
  }
};

const updateDB = async () => {
  const vk = new VK({ token: config.get("serviceToken") });

  let countriesArr = []; //country array

  const preResponse = await vk.api.database.getCountries({ need_all: 1 }); //get countries count

  const countriesCount = preResponse.count; //get countries count

  const response = await vk.api.database.getCountries({
    need_all: 1,
    count: countriesCount
  }); //get all countries

  let arr = response.items;

  for (const item of arr) {
    const { id } = item;
    if (countriesArr.indexOf(id) == -1) countriesArr.push(id); //set countries array
  }

  for (const item of countriesArr) {
    const preResponse = await vk.api.database.getCities({
      country_id: item
    }); //get major cities count of country

    const count = preResponse.count; //get major cities count of country

    const response = await vk.api.database.getCities({
      country_id: item,
      count
    }); //get major cities of country

    arr = response.items;

    await loadData({ type: "cities", arr, countryId: item }); //load cities
  }

  console.log(`Добавлено: ${result.cities} городов`);

  process.exit(0);
};

mongoConnection();
updateDB();
