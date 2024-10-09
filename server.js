require('dotenv').config();  // Load environment variables from .env

const express = require('express');
const { BigQuery } = require('@google-cloud/bigquery');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();

// Use environment variables for key file path and project ID
const keyFilePath = process.env.GOOGLE_KEY_FILE;
const projectId = process.env.GOOGLE_PROJECT_ID;
const dataset = process.env.BIGQUERY_DATASET;
const table = process.env.BIGQUERY_TABLE;

console.log('Key file path:', keyFilePath);

const bigQueryClient = new BigQuery({
  keyFilename: keyFilePath,
  projectId: projectId,
  scopes: ['https://www.googleapis.com/auth/drive'],  // Add Google Drive scope if needed
});

// Middleware setup
app.use(cors());  // Enable CORS
app.use(express.json());  // To handle JSON requests

// Route to get data from BigQuery
app.get('/api/data', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${projectId}.${dataset}.${table}\` `;
    const [rows] = await bigQueryClient.query(query);
    console.log('Data fetched from BigQuery:', rows);

    // Group the data by DelCode_w_o__
    const groupedData = rows.reduce((acc, item) => {
      const key = item.DelCode_w_o__;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    res.status(200).json(groupedData);
  } catch (err) {
    console.error('Error querying BigQuery:', err.message, err.stack);  // Detailed error logging
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// Assuming the correct data is passed from the frontend:
app.post('/api/data', async (req, res) => {
  console.log(req.body);
  const {
    Key,
    Delivery_code,
    DelCode_w_o__,
    Step_ID,
    Task_Details,
    Frequency___Timeline,
    Client,
    Short_description,
    Planned_Start_Timestamp,
    Planned_Delivery_Timestamp,
    Responsibility,
    Current_Status,
    Total_Tasks,
    Completed_Tasks,
    Planned_Tasks,
    Percent_Tasks_Completed,
    Created_at,
    Updated_at,
    Time_Left_For_Next_Task_dd_hh_mm_ss,
    Percent_Delivery_Planned,
    Card_Corner_Status
  } = req.body;

  const query = `
    INSERT INTO \`${projectId}.${dataset}.${table}\` 
    (Key, Delivery_code, DelCode_w_o__, Step_ID, Task_Details, Frequency___Timeline, Client, Short_description, 
    Planned_Start_Timestamp, Planned_Delivery_Timestamp, Responsibility, Current_Status, Total_Tasks, 
    Completed_Tasks, Planned_Tasks, Percent_Tasks_Completed, Created_at, Updated_at, 
    Time_Left_For_Next_Task_dd_hh_mm_ss, Percent_Delivery_Planned, Card_Corner_Status)
    VALUES 
    (@Key, @Delivery_code, @DelCode_w_o__, @Step_ID, @Task_Details, @Frequency___Timeline, @Client, 
    @Short_description, @Planned_Start_Timestamp, @Planned_Delivery_Timestamp, @Responsibility, 
    @Current_Status, @Total_Tasks, @Completed_Tasks, @Planned_Tasks, @Percent_Tasks_Completed, 
    @Created_at, @Updated_at, @Time_Left_For_Next_Task_dd_hh_mm_ss, @Percent_Delivery_Planned, 
    @Card_Corner_Status)
  `;

  const options = {
    query: query,
    params: {
      Key,
      Delivery_code,
      DelCode_w_o__,
      Step_ID,
      Task_Details,
      Frequency___Timeline,
      Client,
      Short_description,
      Planned_Start_Timestamp,
      Planned_Delivery_Timestamp,
      Responsibility,
      Current_Status,
      Total_Tasks,
      Completed_Tasks,
      Planned_Tasks,
      Percent_Tasks_Completed,
      Created_at,
      Updated_at,
      Time_Left_For_Next_Task_dd_hh_mm_ss,
      Percent_Delivery_Planned,
      Card_Corner_Status
    },
  };

  try {
    const [job] = await bigQueryClient.createQueryJob(options);
    await job.getQueryResults();
    res.status(200).send({ message: 'Task inserted successfully.' });
  } catch (error) {
    console.error('Error inserting data into BigQuery:', error);
    res.status(500).send({ error: 'Failed to insert task into BigQuery.' });
  }
});

// Update Task in BigQuery
app.put('/api/data/:key', async (req, res) => {
  const { key } = req.params;
  const { taskName, startDate, endDate, assignTo, status } = req.body;

  const query = `
    UPDATE \`${projectId}.${dataset}.${table}\`
    SET Task = @Task_Details, Start_Date = @Planned_Start_Timestamp, End_Date = @Planned_Delivery_Timestamp, Assign_To = @Responsibility, Status = @Current_Status, Client = @Client, Total_Tasks = @Total_Tasks, Planned_Tasks = @Planned_Tasks, Completed_Tasks = @Completed_Tasks, Created_at = @Created_at, Updated_at = @Updated_at
    WHERE Key = @key
  `;

  const options = {
    query: query,
    params: { key: parseInt(key), taskName, startDate, endDate, assignTo, status },
  };

  try {
    const [job] = await bigQueryClient.createQueryJob(options);
    await job.getQueryResults();
    res.status(200).send({ message: 'Task updated successfully.' });
  } catch (error) {
    console.error('Error updating task in BigQuery:', error);
    res.status(500).send({ error: 'Failed to update task in BigQuery.' });
  }
});

// Delete Task from BigQuery
app.delete('/api/data/:key', async (req, res) => {
  const { key } = req.params;

  const query = `
    DELETE FROM \`${projectId}.${dataset}.${table}\`
    WHERE Key = @key
  `;

  const options = {
    query: query,
    params: { key: parseInt(key) },
  };

  try {
    const [job] = await bigQueryClient.createQueryJob(options);
    await job.getQueryResults();
    res.status(200).send({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task from BigQuery:', error);
    res.status(500).send({ error: 'Failed to delete task from BigQuery.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
