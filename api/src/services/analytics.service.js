const Slot = require('../models/slot.model');
const Booking = require('../models/booking.model');

async function getCounsellorAnalytics(counsellorId) {
  const result = await Booking.aggregate([
    {
      $lookup: {
        from: 'slots',
        localField: 'slot',
        foreignField: '_id',
        as: 'slotData'
      }
    },
    {
      $unwind: '$slotData'
    },
    {
      $match: {
        'slotData.counsellor': counsellorId
      }
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              confirmedBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] }
              },
              attendedBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'attended'] }, 1, 0] }
              },
              noShowBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] }
              },
              cancelledBookings: {
                $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
              }
            }
          }
        ],
        leadTimeBuckets: [
          {
            $match: {
              status: { $in: ['booked', 'attended', 'no_show'] }
            }
          },
          {
            $addFields: {
              leadTimeMinutes: {
                $divide: [
                  { $subtract: ['$slotData.startTime', '$createdAt'] },
                  60000
                ]
              }
            }
          },
          {
            $bucket: {
              groupBy: '$leadTimeMinutes',
              boundaries: [0, 60, 240, 1440, 999999],
              default: '1440+',
              output: {
                count: { $sum: 1 }
              }
            }
          }
        ],
        averageLeadTime: [
          {
            $match: {
              status: { $in: ['booked', 'attended', 'no_show'] }
            }
          },
          {
            $addFields: {
              leadTimeMinutes: {
                $divide: [
                  { $subtract: ['$slotData.startTime', '$createdAt'] },
                  60000
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgLeadTime: { $avg: '$leadTimeMinutes' }
            }
          }
        ],
        busiestSlots: [
          {
            $match: {
              status: { $in: ['booked', 'attended', 'no_show'] }
            }
          },
          {
            $group: {
              _id: '$slot',
              bookingCount: { $sum: 1 },
              slotTitle: { $first: '$slotData.title' },
              slotStart: { $first: '$slotData.startTime' }
            }
          },
          {
            $sort: { bookingCount: -1 }
          },
          {
            $limit: 5
          }
        ],
        dailySeries: [
          {
            $match: {
              status: { $in: ['booked', 'attended', 'no_show'] }
            }
          },
          {
            $addFields: {
              istDate: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: 'Asia/Kolkata'
                }
              }
            }
          },
          {
            $group: {
              _id: '$istDate',
              bookings: { $sum: 1 }
            }
          },
          {
            $sort: { _id: -1 }
          },
          {
            $limit: 14
          }
        ]
      }
    }
  ]);
  
  const slotsData = await Slot.aggregate([
    {
      $match: {
        counsellor: counsellorId
      }
    },
    {
      $group: {
        _id: null,
        totalSlots: { $sum: 1 },
        totalSeats: { $sum: '$capacity' }
      }
    }
  ]);
  
  const data = result[0];
  const overview = data.overview[0] || {
    totalBookings: 0,
    confirmedBookings: 0,
    attendedBookings: 0,
    noShowBookings: 0,
    cancelledBookings: 0
  };
  
  const slotStats = slotsData[0] || { totalSlots: 0, totalSeats: 0 };
  const totalConfirmed = overview.confirmedBookings + overview.attendedBookings + overview.noShowBookings;
  
  const utilization = slotStats.totalSeats > 0 
    ? ((totalConfirmed / slotStats.totalSeats) * 100).toFixed(2)
    : 0;
  
  const noShowRate = totalConfirmed > 0
    ? ((overview.noShowBookings / totalConfirmed) * 100).toFixed(2)
    : 0;
  
  const cancellationRate = overview.totalBookings > 0
    ? ((overview.cancelledBookings / overview.totalBookings) * 100).toFixed(2)
    : 0;
  
  const avgLeadTime = data.averageLeadTime[0]?.avgLeadTime || 0;
  
  const leadTimeBuckets = {
    '0-59': 0,
    '60-239': 0,
    '240-1439': 0,
    '1440+': 0
  };
  
  data.leadTimeBuckets.forEach(bucket => {
    if (bucket._id === 0) leadTimeBuckets['0-59'] = bucket.count;
    else if (bucket._id === 60) leadTimeBuckets['60-239'] = bucket.count;
    else if (bucket._id === 240) leadTimeBuckets['240-1439'] = bucket.count;
    else if (bucket._id === 1440) leadTimeBuckets['1440+'] = bucket.count;
  });
  
  return {
    totalSlots: slotStats.totalSlots,
    totalConfirmedBookings: totalConfirmed,
    utilization: parseFloat(utilization),
    noShowPercentage: parseFloat(noShowRate),
    cancellationPercentage: parseFloat(cancellationRate),
    averageLeadTimeMinutes: Math.round(avgLeadTime),
    leadTimeBuckets,
    busiestSlots: data.busiestSlots,
    last14DaysSeries: data.dailySeries.reverse()
  };
}

module.exports = {
  getCounsellorAnalytics
};
