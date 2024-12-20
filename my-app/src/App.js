import './App.css';
import {useState, useEffect} from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameWeek, min, setDate, transpose } from 'date-fns';
import { PolarArea } from 'react-chartjs-2';
import { Chart, RadialLinearScale, ArcElement, Tooltip, Legend, TimeSeriesScale } from 'chart.js';
import { CategoryScale, LinearScale, BarElement } from 'chart.js';
import { useTimer } from 'react-timer-hook';

import { CgLoadbarSound } from "react-icons/cg";
import { MdNavigateBefore, MdNavigateNext  } from "react-icons/md";
import { GrSubtractCircle, GrAddCircle } from "react-icons/gr";
import { VscDebugRestart } from "react-icons/vsc";
import { FaPlay, FaPause } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";

let sleepData = []; // array that holds all data regarding sleep
let currentDate; // temp variable to set the current date

Chart.register(RadialLinearScale, ArcElement, Tooltip, Legend);
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Defines the 24-Hr Clock
const ClockChart = () => {
  const [clockSelection, setClockSelection] = useState("0:00");

  let tempDateObj = new Date();
  let today = `${tempDateObj.getFullYear()}-${(tempDateObj.getMonth() + 1).toString().padStart(2, '0')}-${tempDateObj.getDate().toString().padStart(2, '0')}`;

  let previousDayObj = new Date();
  previousDayObj.setDate(previousDayObj.getDate() - 1);
  let previousDay = `${previousDayObj.getFullYear()}-${(previousDayObj.getMonth() + 1).toString().padStart(2, '0')}-${previousDayObj.getDate().toString().padStart(2, '0')}`;

  let sleepTime;
  let wakeTime;
  sleepData.forEach(week => {
    // Today
    week.entries.forEach(day => {
      if (day.date === today) {
        sleepTime = day.sleepTime;
        wakeTime = day.wakeTime;
      }
    })
    
    // if there is no date Today
    if (sleepTime === null) {
      week.entries.forEach(day => {
        if (day.date === previousDay) {
          sleepTime = day.sleepTime;
          wakeTime = day.wakeTime;
        }
      })
    }
  });

  let currentTime =  
  `${
    tempDateObj.getHours() < 10 ? '0'+tempDateObj.getHours() : tempDateObj.getHours()
    }:${tempDateObj.getMinutes() < 10 ? '0'+tempDateObj.getMinutes() : tempDateObj.getMinutes()}`;


  let roundedMinutes = Math.floor(tempDateObj.getMinutes() / 10) * 10;
  let mhm = `${
    tempDateObj.getHours().toString().padStart(2, '0')
  }:${roundedMinutes.toString().padStart(2, '0')}`;

  // Generate a full 24-hour cycle in 10-minute increments
  const fullDayCycle = [...Array(144).keys()].map(index => {
    const totalMinutes = index * 10; // Increment by 10 minutes for each label
    const hour = Math.floor(totalMinutes / 60); // Calculate the hour (0-23)
    const minute = totalMinutes % 60; // Calculate the minute (0, 10, ... 50)
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`; // Format time as HH:MM
  });

// Find the index in the 24-hour cycle that matches `currentTime`
const startIndex = fullDayCycle.indexOf(mhm);

// Create a 24-hour cycle starting from `currentTime` and wrapping around
const labels = [...fullDayCycle.slice(startIndex), ...fullDayCycle.slice(0, startIndex)];

const getMinutesSinceMidnight = time => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Get minutes since midnight for sleep and wake times
const sleepMinutes = sleepTime ? getMinutesSinceMidnight(sleepTime) : null;
const wakeMinutes = wakeTime ? getMinutesSinceMidnight(wakeTime) : null;

const backgroundColor = labels.map(label => {
  // Convert the label time to minutes since midnight
  const labelMinutes = getMinutesSinceMidnight(label);

  // Check if the label is within the sleep-wake range
  const isSleepTime = sleepMinutes !== null && wakeMinutes !== null &&
                      ((sleepMinutes < wakeMinutes && labelMinutes >= sleepMinutes && labelMinutes < wakeMinutes) ||
                       (sleepMinutes > wakeMinutes && (labelMinutes >= sleepMinutes || labelMinutes < wakeMinutes)));

  // Return a different color if within sleep time, else default color
  return isSleepTime ? 'rgba(255, 255, 255, 0.4)' : 'rgb(180, 118, 246)';
  });

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Minutes of the Day',
        data: Array(144).fill(1), // Fill data for 1440 intervals
        backgroundColor: backgroundColor,
        hoverBackgroundColor: Array(1440).fill('rgba(255, 255, 255, 0.4)'), // Color when hovering over an interval
        borderWidth: 0,
      },
    ],
  };

  const options = {
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0]; // Get the first clicked element
        const datasetIndex = element.datasetIndex; // Get the dataset index
        const index = element.index; // Get the index of the data point
  
        const label = data.labels[index]; // Retrieve the label of the clicked point
        const value = data.datasets[datasetIndex].data[index]; // Retrieve the value of the clicked point
  
        // Test clicking on clock
        console.log(label);
      }
    },
    scales: {
      r: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        callbacks: {
          title: (tooltipItems) => {
            setClockSelection(tooltipItems[0].label);
          },
          label: (tooltipItem) => {
            return `${tooltipItem.label}: ${tooltipItem.raw}`;
          },
        },
        position: 'nearest',
        external: (context) => {
        }
      }
    },
  };

  return (
    <div>
      <h2>24-Hour Clock</h2>
      <div className="organize">
        <div className='hollow-effect'>
          <p></p>
          {currentTime}
          <div className="hover-time">{clockSelection}</div>
        </div>
        <PolarArea data={data} options={options} />
      </div>
    </div>
  );
};

// Sets up the Bar Chart for displaying Sleep Data for each week
const BarChart = () => {
  let weeklyData = [];
  let weeklyDates = [];

  sleepData.forEach((s)=>{
    let tempArr = [];
    let tempArrDates = [];
    s.entries.forEach(d=>{
      let valueToAdd = 0;
      if(d.data !== null) {
        let addHrs = parseInt(d.data.slice(0, 2)) * 60;
        let addMins = parseInt(d.data.slice(3, 5));
        valueToAdd = addHrs + addMins;
      }
      if (valueToAdd > 600) {
        valueToAdd = 600;
      }
      tempArr = [...tempArr, valueToAdd];
      tempArrDates = [...tempArrDates, d.date];
    });
    weeklyData = [...weeklyData, tempArr];
    weeklyDates = [...weeklyDates, tempArrDates];
  });

  const [weekSelect, setWeekSelect] = useState(0);
  const handleWeekSwitch = (btnType) => {
    if (btnType === "back") {
      if (weekSelect > 0){
        setWeekSelect(weekSelect-1);
      }
    }
    if (btnType === "next") {
      if (weekSelect < weeklyData.length-1){
        setWeekSelect(weekSelect+1);
      }
    }
  }

  const months = ["January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"];

  return (
    <div>
      <br></br>
      <br></br>
      <div className="week-select-heading">
        <button onClick={()=>handleWeekSwitch("back")}
          className="back-next">
          <MdNavigateBefore />
        </button>
        {weeklyDates.length !== 0 && `
        ${months[parseInt(weeklyDates[weekSelect][0].slice(5,7)-1)]} 
        ${weeklyDates[weekSelect][0].slice(8,10)}, 
        ${weeklyDates[weekSelect][0].slice(0,4)} 
        <-> 
        ${months[parseInt(weeklyDates[weekSelect][6].slice(5,7)-1)]} 
        ${weeklyDates[weekSelect][6].slice(8,10)}, 
        ${weeklyDates[weekSelect][6].slice(0,4)}`}
        <button onClick={()=>handleWeekSwitch("next")}
          className="back-next">
          <MdNavigateNext /></button>
      </div>
      <div className="bar-chart-container">
        <div className="bar-chart-border">
          {Array.from({ length: 11 }, (_, index) => (
            <div className="tick-container" key={index}>
              <div>{
                index === 0 ? "10+" : 10 - index
              }</div>
              <div className="tick-line"></div>
            </div>
          ))}
        </div>

        {weeklyData[weekSelect]?.map((item, index) => (
            <div className="bar-item" key={index}>
              {console.log(item)}
              <div
                className="bar"
                style={{
                  height: `${(item / 600) * 20}em`,
                  backgroundColor: 
                    (item >= 600 ?  '#FDFD96' : 
                      ((item<360 && item > 0) ? "red":"rgb(180, 118, 246)" )),
                }}
              ></div>
              <span className="bar-label">
                {weeklyDates[weekSelect][index].slice(8,10)}
              </span>
            </div>
          ))
        }
      </div>
      {/* <p>Yellow = Sleeping too much can also be a sign of underlying issues</p> */}
      {/* <p>Red = Sleeping less than six hours consistently is detrimental</p> */}
    </div>
  );
};

// Handles setting the time for Sleep Time and Wake Time
const TimeScroller = ({setResult, timeNow, date}) => {
  const options = Array.from({ length: 60 }, (_, index) => index);

  const [sleepHours, setSleepHours] = useState(timeNow.slice(0,2));
  const [sleepMins, setSleepMins] = useState(timeNow.slice(3,5));

  let defaultWakeHrRaw = (parseInt(timeNow.slice(0,2)) + 7) % 24;
  let defaultWakeHr = defaultWakeHrRaw < 10 ? '0'+defaultWakeHrRaw  : defaultWakeHrRaw;
  let defaultWakeMinsRaw = (parseInt(timeNow.slice(3,5)) + 30) % 60;
  let defaultWakeMins = defaultWakeMinsRaw < 10 ? '0'+defaultWakeMinsRaw  : defaultWakeMinsRaw;

  if (parseInt(timeNow.slice(3,5)) >= 30) {
    defaultWakeHr++;
    defaultWakeHr = defaultWakeHr < 10 ? '0'+defaultWakeHr : defaultWakeHr;
    if (defaultWakeHr === 24) {
      defaultWakeHr = "00";
    }
  }
  
  const [wakeHours, setWakeHours] = useState(`${defaultWakeHr}`);
  const [wakeMins, setWakeMins] = useState(`${defaultWakeMins}`);

  const handleSleepHours = (event) => {
    setSleepHours(event.target.value);
  }

  const handleSleepMins = (event) => {
    setSleepMins(event.target.value);
  }

  const handleWakeHours = (event) => {
    setWakeHours(event.target.value);
  }

  const handleWakeMins = (event) => {
    setWakeMins(event.target.value);
  }

  const clicking = () => {
    let hoursSlept = 0;
    let temp = parseInt(sleepHours);
    let check = parseInt(wakeHours);
    while (1) {
      hoursSlept++;
      temp = (temp + 1) % 24;

      if (temp === check){
        break;
      }
    }

    let minsSlept = 0;
    temp = parseInt(sleepMins);
    while (1) {
      minsSlept++;
      temp = (temp + 1) % 60;

      if (temp === parseInt(wakeMins)){
        break;
      }
    }

    if (wakeMins < sleepMins) {
      hoursSlept--;
    }

    if (hoursSlept === 24){
      hoursSlept = 0;
    }

    if (minsSlept === 60){
      minsSlept = 0;
    }

    // Helper function to create a new week object
    const createNewWeek = (date) => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

      const weekEntries = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        data: null, // initialize data for each day as null
        sleepTime: null,
        wakeTime: null,
      }));

      return weekEntries;
    };

    // Function to add or update entry for a given date
    const addEntryForDate = (date, entryData) => {
      if (!date){
        return
      }

      const formattedDate = format(date, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Compare weeks by their start date
    
      // Check if the week for the given date already exists
      let week = sleepData.find(week => week.start === weekStart);
      // console.log(week);
    
      if (week) {
        // Week exists, find the specific day in that week
        const dayEntry = week.entries.find(day => day.date === formattedDate);
        if (dayEntry && !dayEntry.data) {
          dayEntry.data = entryData; // Add data for the day if it's empty
          dayEntry.wakeTime = `${wakeHours}:${wakeMins}`;
          dayEntry.sleepTime = `${sleepHours}:${sleepMins}`;
        }
      } else {
        // Week doesn't exist, create a new one
        const newWeek = {
          start: weekStart, // Store the week's start date
          entries: createNewWeek(date), // Create entries for the whole week
        };
        const dayEntry = newWeek.entries.find(day => day.date === formattedDate);
        if (dayEntry) {
          dayEntry.data = entryData; // Add data for the given day
          dayEntry.wakeTime = `${wakeHours}:${wakeMins}`;
          dayEntry.sleepTime = `${sleepHours}:${sleepMins}`;
          // dayEntry.sleepTime = `${sleepHours}:${sleepMins}`;
          // dayEntry.wakeTime = `${wakeHours}:${wakeMins}`;
        }
        sleepData.push(newWeek); // Add the new week to sleepData
      }
    };

    let newSleepRecord = `${
      hoursSlept < 10 ? '0'+hoursSlept : hoursSlept
    }:${minsSlept < 10 ? '0'+minsSlept : minsSlept}`;

    console.log(date);
    addEntryForDate(date, newSleepRecord);

    console.log(sleepData);

    if (date) {
      setResult(newSleepRecord);
    }
    else {
      setResult("Select a Date");
    }
  }

  return (
    <div>
      <div className="manual-timers">
        <div className="manual-timer">
          <p className="headings">Sleep Time</p>
          <select onChange={handleSleepHours} value={sleepHours} className="select-time">
            <option>00</option>
            <option>01</option>
            <option>02</option>
            <option>03</option>
            <option>04</option>
            <option>05</option>
            <option>06</option>
            <option>07</option>
            <option>08</option>
            <option>09</option>
            <option>10</option>
            <option>11</option>
            <option>12</option>
            <option>13</option>
            <option>14</option>
            <option>15</option>
            <option>16</option>
            <option>17</option>
            <option>18</option>
            <option>19</option>
            <option>20</option>
            <option>21</option>
            <option>22</option>
            <option>23</option>
          </select>

          <select onChange={handleSleepMins} value={sleepMins} className="select-time">
            {options.map((option) => (
              <option key={option}>
                {option < 10 ? `0${option}` : option}
              </option>
            ))}
          </select>
        </div>  
          
        <div className="divider"></div> 

        <div className="manual-timer">
          <p className="headings">Wake Time</p>
          <select onChange={handleWakeHours} value={wakeHours} className="select-time">
            <option>00</option>
            <option>01</option>
            <option>02</option>
            <option>03</option>
            <option>04</option>
            <option>05</option>
            <option>06</option>
            <option>07</option>
            <option>08</option>
            <option>09</option>
            <option>10</option>
            <option>11</option>
            <option>12</option>
            <option>13</option>
            <option>14</option>
            <option>15</option>
            <option>16</option>
            <option>17</option>
            <option>18</option>
            <option>19</option>
            <option>20</option>
            <option>21</option>
            <option>22</option>
            <option>23</option>
          </select>

          <select onChange={handleWakeMins} value={wakeMins} className="select-time">
            {options.map((option) => (
              <option key={option}>
                {option < 10 ? `0${option}` : option}
              </option>
            ))}
          </select>
        </div>
      </div>      
        <button onClick={clicking} className="record-sleep">Record Sleep</button>
    </div>
  );
};

// 
const SleepTracking = ({setScreen}) => {
  const [sleepStatus, setSleepStatus] = useState("Sleep");
  const [result, setResult] = useState('');
  const [selectedDate, setSelectedDate] = useState("");
  document.body.style.setProperty('--bg-color', 'rgb(218, 190, 247)');

  let dateObj = new Date();
  const [currentTime, setCurrentTime] = useState(
  // let currentTime =  
  `${
    dateObj.getHours() < 10 ? '0'+dateObj.getHours() : dateObj.getHours()
    }:${dateObj.getMinutes() < 10 ? '0'+dateObj.getMinutes() : dateObj.getMinutes()}`);

    useEffect(() => {
      const interval = setInterval(() => {
        const dateObj = new Date();
        const time = `${
          dateObj.getHours() < 10 ? "0" + dateObj.getHours() : dateObj.getHours()
        }:${dateObj.getMinutes() < 10 ? "0" + dateObj.getMinutes() : dateObj.getMinutes()}`;
        setCurrentTime(time);
      }, 1000);
  
      return () => clearInterval(interval);
    }, []);

  const handleSwitch = () => {
    if (sleepStatus === "Sleep"){
      // alert("Sleep Clicked");
      setSleepStatus("Wake");
    }
    else {
      // alert("Wake Clicked");
      setSleepStatus("Sleep");
    }
  }

  const handleDate = (event) => {
    let year = parseInt(event.target.value.slice(0,4));
    let month = parseInt(event.target.value.slice(5, 7));
    let day = parseInt(event.target.value.slice(8));
    setSelectedDate(new Date (year, month-1, day));
    currentDate = dateObj;
  }

  const [summaryWarning, setSummaryWarning] = useState(false);

  return (
    <div className="main">
      <button className="eat-drink-btn"
      onClick={()=>setScreen("Eat/Drink")}>
        <MdNavigateBefore/>
        <span>Eat/Drink</span>
      </button>
      
      <button className="focus-btn"
      onClick={()=>setScreen("Focus")}>
        <span>Focus</span>
        <MdNavigateNext/>
      </button>

      <h1>Sleep</h1>
        <input type="date" onChange={handleDate} className={"calendar"}></input>
      <p className='sleep-menu-clock'>{currentTime}</p>
        <TimeScroller setResult={setResult} timeNow={currentTime} date={selectedDate}></TimeScroller>
      <p className="display2">Time Slept 
        <p>{result === "Select a Date" ? 
          <span style={{color: 'rgb(174, 0, 0)'}}>Select a Date</span> : result}</p>
      </p>
      <button className="summary-btn"
      onClick={()=>{
        if (sleepData.length > 0){
          setScreen("Summary")
        }
        else if(summaryWarning === false){
          setSummaryWarning(true);
          setTimeout(()=>setSummaryWarning(false), 1000);
        }
        }}><CgLoadbarSound/></button>
      {summaryWarning && (
        <p className="summary-warning">No Sleep Data Currently</p>
      )}
    </div>
  )
}

// Display/Visualize Summary of sleepData
const Summary = ({setScreen}) => {
  let keyCounter = 0;

  let list = [];
  let list2 = [];
  let testList = [];
  const [openWeek, setOpenWeek] = useState(null); // State to track open week

  let ordered = sleepData.sort((a, b) => new Date(a.entries[0].date) - new Date(b.entries[0].date));

  const toggleWeek = (index) => {
    setOpenWeek(openWeek === index ? null : index); // Toggle open/close for each week
  };

  // Value for time slept
  // 600 units (for each minute in 10 hours)
    // Above 10 hours (yellow + warning message)
    // Below 6 (red + warning message)

  // Potential 10+ Message:
    // Sleeping more than 10 hours can be considered oversleeping; 
    // if this pattern persists seeing a health professional is recommended
  // Potential 6- Message: 
    // WARNING: Sleeping less than 6 hours is not enough for most adults!
  ordered.forEach((week, weekIndex) => {    
    testList.push(
      week.entries.map((day, index) => {
      return (
        <div>
          <strong>{day.date}</strong>
          <p>{day.data}</p>

          {/* <p>{day.sleepTime === null ? "" :`Sleep Time: ${day.sleepTime}`}</p> */}
          {/* <p>{day.wakeTime === null ? "" : `Wake Time: ${day.wakeTime}`}</p> */}
        </div>
      )
    }))
  })

  return (
    <div className="summary">
      <button className="back"
      onClick={()=>setScreen("Main")}>
        <MdNavigateBefore/>
      </button>
      <div className="day-wheel">
        <ClockChart></ClockChart>
        <BarChart></BarChart>
      </div>
      {/* DEBUG Original Visualization */}
      {/* {testList.length ?
        testList.map(s =>
          <div>
            <div className='week-border'>
              {s}
            </div>
          </div>
        ) : <p>NO SLEEP DATA...</p>} */}
    </div>
  );
}

// Screen for keeping track of Eating and Drinking
const EatDrink = ({setScreen}) => {
  document.body.style.setProperty('--bg-color', 'rgb(119, 216, 119)');
  const [numEat, setNumEat] = useState(3);
  const [timesEaten, setTimesEaten] = useState(0);
  const [numDrink, setNumDrink] = useState(8);
  const [timesDrank, setTimesDrank] = useState(0);

  useEffect(() => {
    const waterToAdd = ((timesDrank) / numDrink) * 100;
    document.body.style.setProperty('--cup-fill', `${waterToAdd}%`);
  }, [timesDrank, numDrink]); 

  const handleNumEat = () => {
    timesEaten < numEat && setTimesEaten(timesEaten + 1);
  }

  const handleNumDrink = () => {    
    timesDrank < numDrink && setTimesDrank(timesDrank + 1);    
  }

  const handleSubAdd = (sign, type) => {
    if (type === "eat") {
      if (sign === "-") {
        if (numEat > 1) {
          setNumEat(numEat - 1);
        }
        if (timesEaten >= numEat) {
          setTimesEaten(numEat-1 > 0 ? numEat-1 : 1 );
        }
      }
      if (sign === "+") {
        if (numEat < 10) {
          setNumEat(numEat + 1);
        }
      }
    }

    if (type === "drink") {
      if (sign === "-") {
        if (numDrink > 1) {
          setNumDrink(numDrink - 1);
        }
        if (timesDrank >= numDrink) {
          setTimesDrank(numDrink-1 > 0 ? numDrink-1 : 1 );
        }
      }
      if (sign === "+") {
        if (numDrink < 15) {
          setNumDrink(numDrink + 1);
        }
      }
    }
  }

  const handleReset = (type) => {
    type === "eat" && setTimesEaten(0);
    if (type === "drink") {
      setTimesDrank(0);
      document.body.style.setProperty('--cup-fill', `0%`);
    }
  }

  let labels = [];
  let dataCalc = [];
  let backgroundColor = [];

  for (let i = 0; i < numEat; i++) {
    labels = [...labels, i+1];  
    dataCalc = [...dataCalc, 1];
    if (i < timesEaten) {
      backgroundColor = [...backgroundColor, "transparent"];
    }
    else {
      backgroundColor = [...backgroundColor, "rgba(0,0,0,0.5)"];
    }
  }

  const data = {
    labels: labels,
    datasets: [
      {
        data: dataCalc,
        borderWidth: 0.5,
        borderColor: 'black',
        backgroundColor: backgroundColor,
      },
    ],
  };

  const options = {
    scales: {
      r: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        
      },
    },
    animation: {
      animateRotate: false,
      animateScale: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        // Use the callbacks to modify tooltip display
        callbacks: {
        },
        // Fix position at the top
        position: 'nearest',
        external: (context) => {
        }
      }
    },
  };

  return (
    <div className="eat-drink-container">
      <button className="sleep-btnL"
      onClick={()=>setScreen("Main")}>
        <span>Sleep</span>
        <MdNavigateNext/>
      </button>
      <h1>Eat</h1>
      <div className="pizza-background">
        <PolarArea data={data} options={options} />
        <img src='./pizza.webp'></img>
      </div>
      {timesEaten + "/" + numEat}<br></br>
      {numEat}
      <div className="eat-drink-btns-container">
        <button onClick={() => handleSubAdd("-","eat")}
          className='add-sub-circle'>
          <GrSubtractCircle/>
          </button>  
        <button onClick={() => handleNumEat()}
          className="ate-drank-btn">Ate</button>
        <button onClick={() => handleSubAdd("+","eat")}
          className='add-sub-circle'>
          <GrAddCircle/>
          </button> 
      </div>
      <button onClick={() => handleReset("eat")}
        className='add-sub-circle'>
        <VscDebugRestart/>
      </button>
      
      <h1>Drink</h1>
      <div>
        <div className="water-cup">
          <div className='water-cup-fill'></div>
        </div>
      </div>
      {timesDrank + "/" + numDrink}<br></br>
      {numDrink}
      <div className="eat-drink-btns-container">
        <button onClick={() => handleSubAdd("-","drink")}
          className='add-sub-circle'>
          <GrSubtractCircle/></button>  
        <button onClick={() => handleNumDrink()}
          className="ate-drank-btn">Drank</button>
        <button onClick={() => handleSubAdd("+","drink")}
        className='add-sub-circle'>
          <GrAddCircle/></button> 
      </div>
      <button onClick={() => handleReset("drink")}
        className='add-sub-circle'>
        <VscDebugRestart/>
      </button>
    </div>
  );
}

// https://www.npmjs.com/package/react-timer-hook (for details)
// Handles the logic of the Pomodoro Timer
const TimerTest = ({expiryTimestamp}) => {
  const {
    seconds,
    minutes,
    hours,
    pause,
    resume,
    restart,
  } = useTimer({ expiryTimestamp, 
    onExpire: () => {
      if (currTimer === "Work") {
        if (interval > 0) {
          setCurrTimer("Short Break");
          setExpired(true);
          setInterval(interval - 1);
        }
        else {
          setCurrTimer("Long Break");
          setExpired(true);
        }
      }

      if (currTimer === "Short Break") {
        setCurrTimer("Work");
        setExpired(true);
      }

      if (currTimer === "Long Break") {
        setCurrTimer("Work");
        setExpired(true);
        setInterval(startingInterval);
      }
    }, 
    autoStart: false});

  const [playPause, setPlayPause] = useState("Play");
  const [dialogStatus, setDialogStatus] = useState(false);
  const [currTimer, setCurrTimer] = useState("Work");

  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroShort, setPomodoroShort] = useState(5);
  const [pomodoroLong, setPomodoroLong] = useState(10);

  const [startingInterval, setStartingInterval] = useState(2);
  const [interval, setInterval] = useState(startingInterval);
  const [expired, setExpired] = useState(false);

  const calcFunc = () => {
    let calc;
    currTimer === "Work" ? (calc = pomodoroWork * 60) :
      (currTimer === "Short Break" ? (calc = pomodoroShort * 60) :
      (calc = pomodoroLong * 60));
    return calc;
  };

  const updateTimer = () => {
    const time = new Date();
    time.setSeconds(time.getSeconds() + (calcFunc()));
    restart(time);
    pause(time);
    setPlayPause("Play");
  };

  useEffect(() => {
    const time = new Date();
    time.setSeconds(time.getSeconds() + (calcFunc()));
    restart(time);
    pause(time);
    setPlayPause("Play");
    
    if (currTimer === "Short Break") {
      if (expired === true) {
        setExpired(false);
        restart(time);
        setPlayPause("Pause");
      }
    }

    if (currTimer === "Work") {
      if (expired === true) {
        setExpired(false);
        restart(time);
        setPlayPause("Pause");
      }
    }

    if (currTimer === "Long Break") {
      if (expired === true) {
        setExpired(false);
        restart(time);
        setPlayPause("Pause");
      }
    }
  }, [currTimer]); 

  useEffect(() => {
    updateTimer();  
  }, [pomodoroWork, pomodoroShort, pomodoroLong]);

  useEffect(() => {
    if (interval > startingInterval) {
      setInterval(startingInterval);
    }
  }, [interval, startingInterval])

  const handlePlayPause = () => {
    if (playPause === "Play"){
      resume();
      setPlayPause("Pause");
    }
    if (playPause === "Pause"){
      pause();
      setPlayPause("Play");
    }
  };
  
  return (
    <div>
      {/* <p>Audio Player Here</p>
      <p>Rainy Mood</p> */}
      <div style={{fontSize: '100px', color: 'white'}}>
        <span>{hours < 10 ? "0"+hours : hours}</span>:
        <span>{minutes < 10 ? "0"+minutes : minutes}</span>:
        <span>{seconds < 10 ? "0"+seconds : seconds}</span>
      </div>
      <div>
        {/* Restart button */}
        <button onClick={() => {
          updateTimer();
        }} className='focus-restart-btn'>
          <VscDebugRestart/>
          </button>
        {/* Play/Pause Button */}
        <button onClick={()=>handlePlayPause()}
          className='focus-restart-btn'>
          {playPause === "Play" ? <FaPlay /> : <FaPause/>}</button>
      </div>
      <button onClick={()=>setCurrTimer("Work")} className='break-btns'>Work</button>
      <button onClick={()=>setCurrTimer("Short Break")} className='break-btns'>Short Break</button>
      <button onClick={()=>setCurrTimer("Long Break")} className='break-btns'>Long Break</button>
      <p className="focus-text"><u>Current Timer</u> <br></br>{currTimer}</p>
      <p className="focus-text">Breaks Left until Long Break: {interval}
        <span>
          
        </span>
      </p>
      <button onClick={()=>setInterval(startingInterval)}
        className='interval-reset'>Reset Interval</button>
      <br></br>
      <br></br>
      {/* Settings */}
      <button 
        onClick={()=>{setDialogStatus(!dialogStatus)}}
        className={!dialogStatus ? "focus-settings-btn" : "focus-settings-btn2"}>
          <FaGear/>
        </button>
      <dialog open={dialogStatus} className='dialog-test'> 
        <div className='dialog-background'>
          <form method="dialog">
            <button className='dialog-exit'
            onClick={()=>{setDialogStatus(!dialogStatus)}}>x</button>
            <p className="focus-text">Work Timer</p>
            <input type="number" min={1} max={720} 
            value={pomodoroWork}
            className='focus-setting-input'
            onBlur={(event)=>{
              if(event.target.value < 1){
                event.target.value = 1;
              }
              setPomodoroWork(event.target.value);
            }}
            onChange={(event)=>{
              if(event.target.value > 720){
                event.target.value = 720;
              }
              setPomodoroWork(event.target.value);
            }}></input>
            <p className="focus-text">Short Break</p>
            <input type="number" min={0} max={720} 
            value={pomodoroShort}
            className='focus-setting-input'
            onBlur={(event)=>{
              if(event.target.value < 1){
                event.target.value = 1;
              }
              setPomodoroShort(event.target.value);
            }}
            onChange={(event)=>{
              if(event.target.value > 720){
                event.target.value = 720;
              }
              setPomodoroShort(event.target.value);
            }}></input>
            <p className="focus-text">Long Break</p>
            <input type="number" min={0} max={720} 
            value={pomodoroLong}
            className='focus-setting-input'
            onBlur={(event)=>{
              if(event.target.value < 1){
                event.target.value = 1;
              }
              setPomodoroLong(event.target.value);
            }}
            onChange={(event)=>{
              if(event.target.value > 720){
                event.target.value = 720;
              }
              setPomodoroLong(event.target.value);
            }}></input>            
            <p className="focus-text">Short Break Cycles</p>
            <input type="number" min={0} max={720} 
            value={startingInterval}
            className='focus-setting-input'
            onBlur={(event)=>{
              if(event.target.value < 1){
                event.target.value = 0;
              }
              setStartingInterval(event.target.value);
            }}
            onChange={(event)=>{
              setStartingInterval(event.target.value);
            }}></input>
          </form>
        </div>
      </dialog>
    </div>
  )
}

// Container for Focus Screen
const Focus = ({setScreen}) => {
  document.body.style.setProperty('--bg-color', 'rgb(250, 100, 100)');
  const time = new Date();
  time.setSeconds(time.getSeconds() + 600);


  return (
    <div className="focus-container">
      <button className="sleep-btnR"
      onClick={()=>setScreen("Main")}>
        <MdNavigateBefore/>
        <span>Sleep</span>
      </button>
      <h1>Focus</h1>
      <TimerTest expiryTimestamp={time}/>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState("Main");
  
  let content;
  if (screen === "Main"){
    content = <SleepTracking setScreen={setScreen}/>;
  }
  else if (screen === "Summary") {
    content = <Summary setScreen={setScreen}/>
  }
  else if (screen === "Eat/Drink") {
    content = <EatDrink setScreen={setScreen}/>
  }
  else if (screen === "Focus") {
    content = <Focus setScreen={setScreen}/>
  }

  return (
    <div className="App">
      
      {content}
    </div>
  );
}

export default App;