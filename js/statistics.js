const db = new Dexie("db");
db.version(1).stores({
  statistics: "++id,page,FIFO,LFU,LRU,OPT"
});

const dbData = [];

function getLeastTime() {
  const sortData = [
    { value: 0, name: "FIFO" },
    { value: 0, name: "LFU" },
    { value: 0, name: "LRU" },
    { value: 0, name: "OPT" }
  ];
  dbData.forEach(({ id, page, FIFO, LFU, LRU, OPT }) => {
    if (
      FIFO.time <= LFU.time &&
      FIFO.time <= LRU.time &&
      FIFO.time <= OPT.time
    ) {
      sortData[0].value += 1;
    }
    if (LFU.time <= FIFO.time && LFU.time <= LRU.time && LFU.time <= OPT.time) {
      sortData[1].value += 1;
    }
    if (LRU.time <= FIFO.time && LRU.time <= LFU.time && LRU.time <= OPT.time) {
      sortData[2].value += 1;
    }
    if (OPT.time <= FIFO.time && OPT.time <= LRU.time && OPT.time <= LFU.time) {
      sortData[3].value += 1;
    }
  });
  return sortData;
}

function getLostRate() {
  const sortData = [
    {
      name: "FIFO",
      type: "line",
      data: []
    },
    {
      name: "LFU",
      type: "line",
      data: []
    },
    {
      name: "LRU",
      type: "line",
      data: []
    },
    {
      name: "OPT",
      type: "line",
      data: []
    }
  ];
  dbData.forEach(({ id, page, FIFO, LFU, LRU, OPT }) => {
    sortData[0].data.push(
      (FIFO.lostPageTimes / page.pageList.length * 100).toFixed(1)
    );
    sortData[1].data.push(
      (LFU.lostPageTimes / page.pageList.length * 100).toFixed(1)
    );
    sortData[2].data.push(
      (LRU.lostPageTimes / page.pageList.length * 100).toFixed(1)
    );
    sortData[3].data.push(
      (OPT.lostPageTimes / page.pageList.length * 100).toFixed(1)
    );
  });
  return sortData;
}

function getPie() {
  const myChart = echarts.init(document.getElementById("pie"));
  option = {
    title: {
      text: "各算法时间最少次数饼状图",
      x: "center"
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b} : {c} ({d}%)"
    },
    legend: {
      orient: "vertical",
      left: "left",
      data: ["FIFO", "LFU", "LRU", "OPT"]
    },
    series: [
      {
        name: "时间最少次数",
        type: "pie",
        radius: "55%",
        center: ["50%", "60%"],
        data: getLeastTime(),
        itemStyle: {
          emphasis: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)"
          }
        }
      }
    ]
  };
  myChart.setOption(option);
}

function getAxis() {
  const xAxisData = [];
  for (let index = 0; index < dbData.length; index++) {
    xAxisData.push(index);
  }
  const myChart = echarts.init(document.getElementById("axis"));
  option = {
    title: {
      text: "缺页率折线图"
    },
    tooltip: {
      trigger: "axis"
    },
    legend: {
      data: ["FIFO", "LFU", "LRU", "OPT"]
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: xAxisData
    },
    yAxis: {
      type: "value"
    },
    series: getLostRate()
  };
  myChart.setOption(option);
}

$(() => {
  db.statistics
    .each(data => {
      dbData.push(data);
    })
    .then(() => {
      dbData.forEach(({ id, page, FIFO, LFU, LRU, OPT }) => {
        const listTableHtml = `<tr>
                               <th scope="row">${id}</th>
                               <td>${page.pageList.join(" ")}</td>
                               <td>${page.memoryVolume}</td>
                               <td>${page.pageAmount}</td>
                               <td>${page.TLBAmount}</td>
                               <td>${page.memoryTime}</td>
                               <td>${page.TLBTime}</td>
                               <td>${page.interruptTime}</td>
                               <td>${page.hasTLB ? "有" : "无"}</td>
                               <td>${FIFO.time}</td>
                               <td>${LFU.time}</td>
                               <td>${LRU.time}</td>
                               <td>${OPT.time}</td>
                               <td>${(
                                 FIFO.lostPageTimes /
                                 page.pageList.length *
                                 100
                               ).toFixed(1)}%</td>
                               <td>${(
                                 LFU.lostPageTimes /
                                 page.pageList.length *
                                 100
                               ).toFixed(1)}%</td>
                               <td>${(
                                 LRU.lostPageTimes /
                                 page.pageList.length *
                                 100
                               ).toFixed(1)}%</td>
                               <td>${(
                                 OPT.lostPageTimes /
                                 page.pageList.length *
                                 100
                               ).toFixed(1)}%</td>
                             </tr>`;
        $("#listTable tbody").append(listTableHtml);
      });
      getPie();
      getAxis();
    });
});
