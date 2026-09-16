export const betMainConfigs = [
  {
    label: "LP3 Max Bet",
    value: "lp3_max_bet",
    default: 0,
    desc: "LP3 - Maximum Amount on per combination",
  },
  {
    label: "2D Ramble - Max Bet",
    value: "2d_ramble_max_bet",
    default: 0,
    desc: "2D Ramble - Maximum Amount on per combination",
  },
  {
    label: "2D Straight - Max Bet",
    value: "2d_straight_max_bet",
    default: 0,
    desc: "2D Straight - Maximum Amount on per combination",
  },
  {
    label: "3D Straight - Max Bet",
    value: "3d_straight_max_bet",
    default: 0,
    desc: "3D Straight - Maximum Amount on per combination",
  },
  {
    label: "3D Rambolito 3 - Max Bet",
    value: "3d_rambolito3_max_bet",
    default: 0,
    desc: "3D Rambolito 3 - Max Bet",
  },
  {
    label: "3D Rambolito 6 - Max Bet",
    value: "3d_rambolito6_max_bet",
    default: 0,
    desc: "3D Rambolito 6 - Max Bet",
  },
];

export const betTimeConfigs = [
  // {
  //   name: "lp3_9pm",
  //   label: "LP3 9PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "2d_2pm",
  //   label: "2D 2PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "2d_5pm",
  //   label: "2D 5PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "2d_9pm",
  //   label: "2D 9PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "3d_2pm",
  //   label: "3D 2PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "3d_5pm",
  //   label: "3D 5PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
  // {
  //   name: "3d_9pm",
  //   label: "3D 9PM",
  //   drawTime: "",
  //   cutoffTime: "",
  //   isActive: false,
  // },
];

export const otherConfigs = [
  {
    title: "Monthly Bracket",
    key: "2d_monthly_bracket_prize",
    fields: [
      {
        label: "2D Straight - Prize per 10 pesos",
        key: "2d_monthly_bracket_prize_per_ten_straight",
        value: "",
      },
      {
        label: "2D Ramble - Prize per 10 pesos",
        key: "2d_monthly_bracket_prize_per_ten_ramble",
        value: "",
      },
    ],
    isActive: false,
  },
  {
    title: "Petsada",
    key: "2d_petsada_prize",
    fields: [
      {
        label: "2D Straight - Prize per 10 pesos",
        key: "2d_petsada_prize_per_ten_straight",
        value: "",
      },
      {
        label: "2D Ramble - Prize per 10 pesos",
        key: "2d_petsada_prize_per_ten_ramble",
        value: "",
      },
    ],
    isActive: false,
  },
  {
    title: "Pompyang",
    key: "2d_pompyang",
    fields: [
      {
        label: "2D - Prize per 10 pesos",
        key: "2d_pompyang_prize_per_ten",
        value: "",
      },
    ],
    isActive: false,
  },
  {
    title: "Bet Entry",
    key: "bet_entry",
    fields: [],
    isActive: true,
  },
];
