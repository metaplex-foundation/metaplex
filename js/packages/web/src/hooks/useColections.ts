import json from '../db.json';

export const useColections = () => {
  console.log(json.colections);
  const data = json.colections;
  return { data };
};

export const useColection = (param?: string) => {
  let colectionData;
  json.colections.map(item => {
    if (item.id == param) {
      colectionData = item;
    }
  });
  return { colectionData };
};
