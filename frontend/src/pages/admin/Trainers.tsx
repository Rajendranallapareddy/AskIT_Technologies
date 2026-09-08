import {
  useEffect,
  useState,
} from 'react';

import {
  Plus,
  Link2,
  Edit2,
  Ban,
  CheckCircle,
  Trash2,
  XCircle,
  KeyRound,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import DataTable, {
  Column,
} from '../../components/admin/DataTable';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SetPasswordModal from '../../components/admin/SetPasswordModal';
import { initials } from '../../utils/formatters';

const emptyCreateForm = {
  fullName: '',
  email: '',
  mobileNumber: '',
  password: '',
  experienceYears: 1,
  bio: '',
  expertise: '',
};

export default function AdminTrainers() {
  const links =
    useAdminLinks();

  const [
    trainers,
    setTrainers,
  ] =
    useState<any[] | null>(
      null
    );

  const [
    internships,
    setInternships,
  ] =
    useState<any[]>([]);

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    createForm,
    setCreateForm,
  ] =
    useState(
      emptyCreateForm
    );

  const [
    editTarget,
    setEditTarget,
  ] =
    useState<any | null>(
      null
    );

  const [
    editForm,
    setEditForm,
  ] =
    useState<any>(
      null
    );

  const [
    assignOpen,
    setAssignOpen,
  ] =
    useState<any | null>(
      null
    );

  const [
    assignInternshipId,
    setAssignInternshipId,
  ] =
    useState('');

  const [
    passwordTarget,
    setPasswordTarget,
  ] =
    useState<any | null>(
      null
    );

  const toast =
    useToast();

  const load = () => {
    setTrainers(null);

    adminApi
      .trainers()
      .then(
        (response) =>
          setTrainers(
            response.data
              .data
          )
      )
      .catch(
        (err) => {
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

    adminApi
      .internships({
        limit: 100,
      })
      .then(
        (response) =>
          setInternships(
            response.data
              .data
          )
      )
      .catch(
        (err) => {
          setInternships(
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

  const handleCreate =
    async () => {
      try {
        await adminApi.createTrainer({
          ...createForm,

          expertise:
            createForm.expertise
              .split(',')
              .map(
                (
                  item
                ) =>
                  item.trim()
              )
              .filter(
                Boolean
              ),
        });

        toast.success(
          'Trainer created'
        );

        setCreateOpen(
          false
        );

        setCreateForm(
          emptyCreateForm
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

  const openEdit =
    (trainer: any) => {
      setEditTarget(
        trainer
      );

      setEditForm({
        fullName:
          trainer.user
            .fullName,

        email:
          trainer.user.email,

        mobileNumber:
          trainer.user
            .mobileNumber,

        experienceYears:
          trainer.experienceYears,

        expertise:
          (
            trainer.expertise ||
            []
          ).join(', '),

        bio:
          trainer.bio ||
          '',

        availability:
          trainer.availability ||
          '',
      });
    };

  const handleEditSave =
    async () => {
      try {
        await adminApi.updateTrainer(
          editTarget.id,
          {
            ...editForm,

            expertise:
              editForm.expertise
                .split(',')
                .map(
                  (
                    value: string
                  ) =>
                    value.trim()
                )
                .filter(
                  Boolean
                ),
          }
        );

        toast.success(
          'Trainer updated'
        );

        setEditTarget(
          null
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

  const handleToggleActive =
    async (
      trainer: any
    ) => {
      try {
        if (
          trainer.user
            .isActive
        ) {
          await adminApi.deactivateUser(
            trainer.user.id
          );
        } else {
          await adminApi.activateUser(
            trainer.user.id
          );
        }

        toast.success(
          trainer.user
            .isActive
            ? 'Trainer deactivated'
            : 'Trainer activated'
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

  const handleDelete =
    async (
      trainer: any
    ) => {
      if (
        !confirm(
          `Delete trainer ${trainer.user.fullName}? This cannot be undone.`
        )
      ) {
        return;
      }

      try {
        await adminApi.deleteTrainer(
          trainer.id
        );

        toast.success(
          'Trainer deleted'
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

  const handleSetPassword =
    async (
      newPassword: string
    ) => {
      try {
        await adminApi.resetUserPassword(
          passwordTarget
            .user.id,
          newPassword
        );

        toast.success(
          `Password updated for ${passwordTarget.user.fullName}`
        );

        setPasswordTarget(
          null
        );
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );

        throw err;
      }
    };

  const getAssignedTrainerIds =
    (
      internshipId: string
    ): string[] => {
      if (
        !Array.isArray(
          trainers
        )
      ) {
        return [];
      }

      return trainers
        .filter(
          (
            trainer: any
          ) =>
            Array.isArray(
              trainer.internships
            ) &&
            trainer.internships.some(
              (
                internship: any
              ) =>
                internship.id ===
                internshipId
            )
        )
        .map(
          (
            trainer: any
          ) =>
            trainer.id
        );
    };

  const openAssign =
    (
      trainer: any
    ) => {
      setAssignOpen(
        trainer
      );

      const current =
        Array.isArray(
          trainer.internships
        )
          ? trainer
              .internships[0]
          : null;

      setAssignInternshipId(
        current?.id ||
          ''
      );
    };

  const handleAssign =
    async () => {
      if (
        !assignOpen ||
        !assignInternshipId
      ) {
        return;
      }

      try {
        const currentIds =
          getAssignedTrainerIds(
            assignInternshipId
          );

        const trainerIds =
          Array.from(
            new Set([
              ...currentIds,
              assignOpen.id,
            ])
          );

        await adminApi.setInternshipTrainers(
          assignInternshipId,
          trainerIds
        );

        toast.success(
          'Trainer assigned'
        );

        setAssignOpen(
          null
        );

        setAssignInternshipId(
          ''
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

  const handleUnassign =
    async (
      internshipId: string
    ) => {
      if (!assignOpen) {
        return;
      }

      try {
        const remainingIds =
          getAssignedTrainerIds(
            internshipId
          ).filter(
            (id) =>
              id !==
              assignOpen.id
          );

        await adminApi.setInternshipTrainers(
          internshipId,
          remainingIds
        );

        toast.success(
          'Trainer removed from internship'
        );

        setAssignOpen(
          null
        );

        setAssignInternshipId(
          ''
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

  const trainerInternships =
    (
      trainerId: string
    ) => {
      if (
        !Array.isArray(
          trainers
        )
      ) {
        return [];
      }

      const trainer =
        trainers.find(
          (
            item: any
          ) =>
            item.id ===
            trainerId
        );

      return Array.isArray(
        trainer?.internships
      )
        ? trainer.internships
        : [];
    };

  const columns: Column<any>[] =
    [
      {
        header:
          'Trainer',

        render: (
          trainer
        ) => (
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center">
              {initials(
                trainer.user
                  .fullName
              )}
            </span>

            <div>
              <span className="font-semibold text-navy-800 block">
                {
                  trainer
                    .user
                    .fullName
                }
              </span>

              {!trainer.user
                .isActive && (
                <span className="text-[10px] font-bold text-red-500">
                  INACTIVE
                </span>
              )}
            </div>
          </div>
        ),
      },

      {
        header:
          'Email',

        render: (
          trainer
        ) =>
          trainer.user
            .email,
      },

      {
        header:
          'Experience',

        render: (
          trainer
        ) =>
          `${trainer.experienceYears} yrs`,
      },

      {
        header:
          'Expertise',

        render: (
          trainer
        ) =>
          (
            trainer.expertise ||
            []
          ).join(', ') ||
          '—',
      },

      {
        header:
          'Assigned Internships',

        render: (
          trainer
        ) => {
          const assigned =
            trainerInternships(
              trainer.id
            );

          return assigned.length
            ? assigned
                .map(
                  (internship: any) =>
                    internship.title
                )
                .join(', ')
            : (
              <span className="text-navy-400">
                None
              </span>
            );
        },
      },

      {
        header:
          'Actions',

        render: (
          trainer
        ) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                openEdit(
                  trainer
                )
              }
              className="text-navy-400 hover:text-orange-500"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                setPasswordTarget(
                  trainer
                )
              }
              className="text-navy-400 hover:text-orange-500"
              title="Set password"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                openAssign(
                  trainer
                )
              }
              className="text-navy-400 hover:text-orange-500"
              title="Assign to internship"
            >
              <Link2 className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                handleToggleActive(
                  trainer
                )
              }
              className="text-navy-400 hover:text-orange-500"
              title={
                trainer.user
                  .isActive
                  ? 'Deactivate'
                  : 'Activate'
              }
            >
              {trainer.user
                .isActive ? (
                <Ban className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() =>
                handleDelete(
                  trainer
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
      pageTitle="Manage Trainers"
    >
      <div className="flex justify-end mb-5">
        <Button
          onClick={() =>
            setCreateOpen(
              true
            )
          }
          icon={
            <Plus className="w-4 h-4" />
          }
        >
          Add Trainer
        </Button>
      </div>

      <DataTable
        columns={
          columns
        }
        rows={
          trainers
        }
        keyField={(
          trainer
        ) =>
          trainer.id
        }
        emptyTitle="No trainers yet"
        emptyDescription="Click 'Add Trainer' to create your first trainer profile."
      />

      <Modal
        isOpen={
          createOpen
        }
        onClose={() =>
          setCreateOpen(
            false
          )
        }
        title="Add New Trainer"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Full Name
            </label>

            <input
              className="input-field"
              value={
                createForm.fullName
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  fullName:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Email
            </label>

            <input
              type="email"
              className="input-field"
              value={
                createForm.email
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  email:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Mobile
            </label>

            <input
              className="input-field"
              value={
                createForm.mobileNumber
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  mobileNumber:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Password
            </label>

            <input
              type="password"
              className="input-field"
              value={
                createForm.password
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  password:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Years of
              Experience
            </label>

            <input
              type="number"
              className="input-field"
              value={
                createForm.experienceYears
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  experienceYears:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Expertise
              (comma-separated)
            </label>

            <input
              className="input-field"
              value={
                createForm.expertise
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  expertise:
                    event
                      .target
                      .value,
                })
              }
              placeholder="Java, Spring Boot"
            />
          </div>

          <div>
            <label className="label">
              Bio
            </label>

            <textarea
              rows={2}
              className="input-field"
              value={
                createForm.bio
              }
              onChange={(
                event
              ) =>
                setCreateForm({
                  ...createForm,

                  bio:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <Button
            className="w-full"
            onClick={
              handleCreate
            }
          >
            Create Trainer
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={
          !!editTarget
        }
        onClose={() =>
          setEditTarget(
            null
          )
        }
        title={`Edit ${
          editTarget?.user
            ?.fullName ||
          'Trainer'
        }`}
      >
        {editForm && (
          <div className="space-y-4">
            <div>
              <label className="label">
                Full Name
              </label>

              <input
                className="input-field"
                value={
                  editForm.fullName
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    fullName:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Email
              </label>

              <input
                type="email"
                className="input-field"
                value={
                  editForm.email
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    email:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Mobile
              </label>

              <input
                className="input-field"
                value={
                  editForm.mobileNumber
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    mobileNumber:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Years of
                Experience
              </label>

              <input
                type="number"
                className="input-field"
                value={
                  editForm.experienceYears
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    experienceYears:
                      Number(
                        event
                          .target
                          .value
                      ),
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Expertise
              </label>

              <input
                className="input-field"
                value={
                  editForm.expertise
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    expertise:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Bio
              </label>

              <textarea
                rows={2}
                className="input-field"
                value={
                  editForm.bio
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    bio:
                      event
                        .target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Availability
              </label>

              <input
                className="input-field"
                value={
                  editForm.availability
                }
                onChange={(
                  event
                ) =>
                  setEditForm({
                    ...editForm,

                    availability:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="e.g. Weekday evenings"
              />
            </div>

            <Button
              className="w-full"
              onClick={
                handleEditSave
              }
            >
              Save Changes
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={
          !!assignOpen
        }
        onClose={() =>
          setAssignOpen(
            null
          )
        }
        title={`Assign ${
          assignOpen?.user
            ?.fullName ||
          ''
        } to an Internship`}
      >
        <div className="space-y-4">
          <select
            className="input-field"
            value={
              assignInternshipId
            }
            onChange={(
              event
            ) =>
              setAssignInternshipId(
                event
                  .target
                  .value
              )
            }
          >
            <option value="">
              Select
              internship…
            </option>

            {internships.map(
              (internship: any) => {
                const assignedIds =
                  getAssignedTrainerIds(
                    internship.id
                  );

                const names =
                  (
                    Array.isArray(
                      trainers
                    )
                      ? trainers
                      : []
                  )
                    .filter(
                      (
                        trainer: any
                      ) =>
                        assignedIds.includes(
                          trainer.id
                        )
                    )
                    .map(
                      (
                        trainer: any
                      ) =>
                        trainer
                          .user
                          ?.fullName
                    )
                    .filter(
                      Boolean
                    )
                    .join(', ');

                return (
                  <option
                    key={
                      internship.id
                    }
                    value={
                      internship.id
                    }
                  >
                    {
                      internship.title
                    }

                    {names
                      ? ` (trainers: ${names})`
                      : ''}
                  </option>
                );
              }
            )}
          </select>

          <Button
            className="w-full"
            onClick={
              handleAssign
            }
            disabled={
              !assignInternshipId
            }
          >
            Assign Trainer
          </Button>

          {assignOpen &&
            trainerInternships(
              assignOpen.id
            ).length >
              0 && (
              <div className="pt-3 border-t border-navy-100">
                <p className="text-xs font-semibold text-navy-500 mb-2">
                  Currently
                  assigned to:
                </p>

                {trainerInternships(
                  assignOpen.id
                ).map(
                  (internship: any) => (
                    <div
                      key={
                        internship.id
                      }
                      className="flex items-center justify-between text-sm py-1.5"
                    >
                      <span>
                        {
                          internship.title
                        }
                      </span>

                      <button
                        onClick={() =>
                          handleUnassign(
                            internship.id
                          )
                        }
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-bold"
                      >
                        <XCircle className="w-3.5 h-3.5" />

                        Unassign
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      </Modal>

      <SetPasswordModal
        isOpen={
          !!passwordTarget
        }
        onClose={() =>
          setPasswordTarget(
            null
          )
        }
        targetName={
          passwordTarget?.user
            ?.fullName ||
          'this Trainer'
        }
        onSubmit={
          handleSetPassword
        }
      />
    </DashboardLayout>
  );
}