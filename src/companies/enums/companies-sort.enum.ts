export enum CompanySortOptions {
  name = 'name',
  assignedToName = 'assignedToName',
  createdAt = 'createdAt',
  currentStage = 'currentStage',
  status = 'status',
  progress = 'progress',
  location = 'location',
  taskDescription = 'taskDescription',
  //chatbot
  chatbotStatus = 'chatbotStatus',
  chatbotDate = 'chatbotDate',
  chatbotLastTopic = 'chatbotLastTopic',
  chatbotHasRequest = 'chatbotHasRequest',
}

export enum CompanyMeetingSortOptions {
  date = 'date',
  time = 'time',
  meetingType = 'meetingType',
  method = 'method',
}

export const CompanySortObject = {
  [CompanySortOptions.name]: 'name',
  [CompanySortOptions.createdAt]: 'createdAt',
  [CompanySortOptions.currentStage]: 'currentStage',
  [CompanySortOptions.status]: 'status',
  [CompanySortOptions.progress]: 'progress',
  //chatbot
};

export const CompanyMeetingSortObject = {
  [CompanyMeetingSortOptions.date]: 'date',
  [CompanyMeetingSortOptions.time]: 'date',
  [CompanyMeetingSortOptions.meetingType]: 'createdAt',
};
