import {
  useEffect,
  useState,
} from 'react';

import {
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';
import DataTable, {
  Column,
} from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Link } from 'react-router-dom';
import type { Internship } from '../../types';

const emptyForm = {
  title: '',
  description: '',
  duration: '',
  startDate: '',
  endDate: '',
  registrationDeadline: '',
  totalSeats: 20,
  mode: 'ONLINE',
  status: 'DRAFT',
  fee: '',
  earlyBirdFee: '',
  earlyBirdDeadline: '',
  gstPercentage: '',
  trainerIds: [] as string[],
};

function getTrainerIds(
  internship: any
): string[] {
  if (
    Array.isArray(
      internship?.trainerAssignments
    )
  ) {
    return internship.trainerAssignments
      .map(
        (
          assignment: any
        ) =>
          assignment?.trainer
            ?.id ||
          assignment?.trainerId
      )
      .filter(Boolean);
  }

  if (
    Array.isArray(
      internship?.trainers
    )
  ) {
    return internship.trainers
      .map(
        (
          trainer: any
        ) =>
          trainer.id
      )
      .filter(Boolean);
  }

  return internship?.trainer?.id
    ? [
        internship.trainer.id,
      ]
    : [];
}

function getTrainerNames(
  internship: any
): string[] {
  if (
    Array.isArray(
      internship?.trainerAssignments
    )
  ) {
    return internship.trainerAssignments
      .map(
        (
          assignment: any
        ) =>
          assignment?.trainer
            ?.user
            ?.fullName
      )
      .filter(Boolean);
  }

  if (
    Array.isArray(
      internship?.trainers
    )
  ) {
    return internship.trainers
      .map(
        (
          trainer: any
        ) =>
          trainer?.user
            ?.fullName
      )
      .filter(Boolean);
  }

  return internship?.trainer
    ?.user?.fullName
    ? [
        internship.trainer
          .user.fullName,
      ]
    : [];
}

export default function AdminInternships() {
  const links =
    useAdminLinks();

  const [
    internships,
    setInternships,
  ] =
    useState<
      Internship[] | null
    >(null);

  const [
    trainers,
    setTrainers,
  ] =
    useState<any[]>([]);

  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState<Internship | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<any>(
      emptyForm
    );

  const toast =
    useToast();

  const load = () => {
    setInternships(null);

    Promise.all([
      adminApi.internships({
        limit: 50,
      }),

      adminApi.trainers(),
    ])
      .then(
        ([
          internshipResponse,
          trainerResponse,
        ]) => {
          const internshipRows =
            internshipResponse
              .data.data ||
            [];

          const trainerRows =
            trainerResponse
              .data.data ||
            [];

          setTrainers(
            trainerRows
          );

          const enriched =
            internshipRows.map(
              (
                internship: any
              ) => ({
                ...internship,

                trainerAssignments:
                  trainerRows
                    .filter(
                      (
                        trainer: any
                      ) =>
                        Array.isArray(
                          trainer.internships
                        ) &&
                        trainer.internships.some(
                          (
                            item: any
                          ) =>
                            item.id ===
                            internship.id
                        )
                    )
                    .map(
                      (
                        trainer: any
                      ) => ({
                        trainerId:
                          trainer.id,

                        trainer,
                      })
                    ),
              })
            );

          setInternships(
            enriched
          );
        }
      )
      .catch(
        (err) => {
          setInternships(
            []
          );

          setTrainers(
            []
          );

          toast.error(
            getErrorMessage(
              err
            )
          );
        }
      );
  };

  useEffect(
    load,
    []
  );
  // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate =
    () => {
      setEditing(null);

      setForm({
        ...emptyForm,
        trainerIds: [],
      });

      setModalOpen(
        true
      );
    };

  const openEdit =
    (internship: any) => {
      setEditing(
        internship
      );

      setForm({
        title:
          internship.title,

        description:
          internship.description,

        duration:
          internship.duration,

        startDate:
          internship.startDate
            ?.slice(0, 10),

        endDate:
          internship.endDate
            ?.slice(0, 10),

        registrationDeadline:
          internship.registrationDeadline
            ?.slice(0, 10),

        totalSeats:
          internship.totalSeats,

        mode:
          internship.mode,

        status:
          internship.status,

        fee:
          internship.fee ||
          '',

        earlyBirdFee:
          internship.earlyBirdFee ||
          '',

        earlyBirdDeadline:
          internship.earlyBirdDeadline
            ?.slice(0, 10) ||
          '',

        gstPercentage:
          internship.gstPercentage ||
          '',

        trainerIds:
          getTrainerIds(
            internship
          ),
      });

      setModalOpen(
        true
      );
    };

  const toggleTrainer =
    (
      trainerId: string
    ) => {
      const current:
        string[] =
        Array.isArray(
          form.trainerIds
        )
          ? form.trainerIds
          : [];

      setForm({
        ...form,

        trainerIds:
          current.includes(
            trainerId
          )
            ? current.filter(
                (id) =>
                  id !==
                  trainerId
              )
            : [
                ...current,
                trainerId,
              ],
      });
    };

  const handleSubmit =
    async () => {
      try {
        const {
          trainerIds,
          ...internshipPayload
        } = form;

        let internshipId:
          string;

        if (editing) {
          await adminApi.updateInternship(
            editing.id,
            internshipPayload
          );

          internshipId =
            editing.id;
        } else {
          const response =
            await adminApi.createInternship(
              internshipPayload
            );

          internshipId =
            response.data
              .data.id;
        }

        await adminApi.setInternshipTrainers(
          internshipId,

          Array.isArray(
            trainerIds
          )
            ? trainerIds
            : []
        );

        toast.success(
          editing
            ? 'Internship updated'
            : 'Internship created'
        );

        setModalOpen(
          false
        );

        setEditing(
          null
        );

        setForm({
          ...emptyForm,
          trainerIds: [],
        });

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );
      }
    };

  const handleDelete =
    async (
      internship: any
    ) => {
      if (
        !confirm(
          `Delete "${internship.title}"?`
        )
      ) {
        return;
      }

      try {
        await adminApi.deleteInternship(
          internship.id
        );

        toast.success(
          'Internship deleted'
        );

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );
      }
    };

  const columns: Column<any>[] =
    [
      {
        header:
          'Title',

        render: (
          internship
        ) => (
          <span className="font-semibold text-navy-800">
            {
              internship.title
            }
          </span>
        ),
      },

      {
        header:
          'Trainers',

        render: (
          internship
        ) => {
          const names =
            getTrainerNames(
              internship
            );

          return names.length
            ? names.join(
                ', '
              )
            : '—';
        },
      },

      {
        header:
          'Seats',

        render: (
          internship
        ) =>
          `${internship.seatsFilled}/${internship.totalSeats}`,
      },

      {
        header:
          'Starts',

        render: (
          internship
        ) =>
          formatDate(
            internship.startDate
          ),
      },

      {
        header:
          'Status',

        render: (
          internship
        ) => (
          <StatusBadge
            status={
              internship.status
            }
          />
        ),
      },

      {
        header:
          'Registrations',

        render: (
          internship
        ) => (
          <Link
            to={`/admin/registrations?internshipId=${internship.id}`}
            className="text-orange-600 font-semibold text-xs hover:underline"
          >
            View (
            {internship
              ._count
              ?.registrations ||
              0}
            )
          </Link>
        ),
      },

      {
        header:
          'Actions',

        render: (
          internship
        ) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                openEdit(
                  internship
                )
              }
              className="text-navy-400 hover:text-orange-500"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                handleDelete(
                  internship
                )
              }
              className="text-navy-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ];

  return (
    <DashboardLayout
      links={links}
      title="Admin Portal"
      pageTitle="Manage Internships"
    >
      <div className="flex justify-end mb-5">
        <Button
          onClick={
            openCreate
          }
          icon={
            <Plus className="w-4 h-4" />
          }
        >
          New Internship
        </Button>
      </div>

      <DataTable
        columns={
          columns
        }
        rows={
          internships
        }
        keyField={(
          internship
        ) =>
          internship.id
        }
        emptyTitle="No internships yet"
      />

      <Modal
        isOpen={
          modalOpen
        }
        onClose={() =>
          setModalOpen(
            false
          )
        }
        title={
          editing
            ? 'Edit Internship'
            : 'New Internship'
        }
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Title
            </label>

            <input
              className="input-field"
              value={
                form.title
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,
                  title:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Description
            </label>

            <textarea
              rows={3}
              className="input-field"
              value={
                form.description
              }
              onChange={(
                event
              ) =>
                setForm({
                  ...form,

                  description:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Duration
              </label>

              <input
                className="input-field"
                value={
                  form.duration
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    duration:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="e.g. 3 Months"
              />
            </div>

            <div>
              <label className="label">
                Total Seats
              </label>

              <input
                type="number"
                className="input-field"
                value={
                  form.totalSeats
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    totalSeats:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Fee
                (optional)
              </label>

              <input
                type="number"
                className="input-field"
                value={
                  form.fee
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    fee:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="Leave blank for free"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Early-Bird
                Fee
              </label>

              <input
                type="number"
                className="input-field"
                value={
                  form.earlyBirdFee
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    earlyBirdFee:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Early-Bird
                Deadline
              </label>

              <input
                type="date"
                className="input-field"
                value={
                  form.earlyBirdDeadline
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    earlyBirdDeadline:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                GST %
              </label>

              <input
                type="number"
                className="input-field"
                value={
                  form.gstPercentage
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    gstPercentage:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">
                Start Date
              </label>

              <input
                type="date"
                className="input-field"
                value={
                  form.startDate
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    startDate:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                End Date
              </label>

              <input
                type="date"
                className="input-field"
                value={
                  form.endDate
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    endDate:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Registration
                Deadline
              </label>

              <input
                type="date"
                className="input-field"
                value={
                  form.registrationDeadline
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    registrationDeadline:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Mode
              </label>

              <select
                className="input-field"
                value={
                  form.mode
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    mode:
                      event
                        .target
                        .value,
                  })
                }
              >
                <option value="ONLINE">
                  Online
                </option>

                <option value="OFFLINE">
                  Offline
                </option>

                <option value="HYBRID">
                  Hybrid
                </option>
              </select>
            </div>

            <div>
              <label className="label">
                Status
              </label>

              <select
                className="input-field"
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    status:
                      event
                        .target
                        .value,
                  })
                }
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="OPEN">
                  Open
                </option>

                <option value="CLOSED">
                  Closed
                </option>

                <option value="ONGOING">
                  Ongoing
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

                <option value="ARCHIVED">
                  Archived
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              Trainers
              (multiple
              allowed)
            </label>

            {trainers.length ===
            0 ? (
              <p className="text-xs text-navy-400 mt-1">
                No trainers
                exist yet —
                add one from
                the Trainers
                page first.
              </p>
            ) : (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-navy-100 divide-y divide-navy-50">
                {trainers.map(
                  (
                    trainer
                  ) => {
                    const checked =
                      (
                        form.trainerIds ||
                        []
                      ).includes(
                        trainer.id
                      );

                    return (
                      <label
                        key={
                          trainer.id
                        }
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-navy-50"
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggleTrainer(
                              trainer.id
                            )
                          }
                          className="w-4 h-4"
                        />

                        <div>
                          <p className="text-sm font-medium text-navy-800">
                            {
                              trainer
                                .user
                                .fullName
                            }
                          </p>

                          <p className="text-xs text-navy-400">
                            {
                              trainer
                                .user
                                .email
                            }
                          </p>
                        </div>
                      </label>
                    );
                  }
                )}
              </div>
            )}

            <p className="text-xs text-navy-400 mt-2">
              You may select
              no trainer,
              one trainer,
              or multiple
              trainers.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={
              handleSubmit
            }
          >
            {editing
              ? 'Save Changes'
              : 'Create Internship'}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}